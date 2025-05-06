import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Shop } from "@/app/models/Shop";
import { Admin } from "@/app/models/Admin";
import { Customer } from "@/app/models/Customer"; // Add this import
import { pusherServer } from "@/app/lib/pusherServer"; // Add this import
import { Notification } from "@/app/models/Notification"; // Add this import

export async function POST(request: Request) {
  try {
    console.log("add-machine API called");
    await dbConnect();

    const { shop_id, machine } = await request.json();

    // Validate required fields
    if (!shop_id || !machine || !machine.machine_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if the shop exists
    const shop = await Shop.findOne({ shop_id });
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Add the new machine to the shop's machines array
    const updatedShop = await Shop.findOneAndUpdate(
      { shop_id },
      {
        $push: {
          machines: {
            machine_id: machine.machine_id,
            minimum_kg: machine.minimum_kg,
            minimum_minutes: machine.minimum_minutes,
            availability: machine.availability.map((slot: any) => ({
              date: slot.date,
              open: slot.open,
              close: slot.close,
            })),
            price_per_minimum_kg: machine.price_per_minimum_kg,
            appointments: [], // Ensure appointments is initialized as an empty array
            type: machine.type,
          },
        },
      },
      { new: true } // Return the updated shop object
    );

    if (!updatedShop) {
      return NextResponse.json(
        { error: "Failed to add machine to the shop" },
        { status: 500 }
      );
    }

    // Update the machines array in the Admin document
    const updatedAdmin = await Admin.findOneAndUpdate(
      { "shops.shop_id": shop_id },
      {
        $set: {
          "shops.$.machines": updatedShop.machines, // Sync the machines array
        },
      },
      { new: true }
    );

    if (!updatedAdmin) {
      return NextResponse.json(
        { error: "Admin or shop not found" },
        { status: 404 }
      );
    }

    // Notify customers about the new machine
    try {
      // 1. Get all customers who have ordered from this shop
      const customers = await Customer.find({
        "orders.shop": shop_id,
      }).select("customer_id");

      console.log(
        `[Add Machine] Found ${customers.length} customers to notify`
      );

      // 2. Create notification data
      const notificationData = {
        shop_id,
        shop_name: updatedShop.name,
        machine: {
          machine_id: machine.machine_id,
          type: machine.type,
          minimum_kg: machine.minimum_kg,
          minimum_minutes: machine.minimum_minutes,
          price_per_minimum_kg: machine.price_per_minimum_kg,
        },
        timestamp: new Date().toISOString(),
      };

      // 3. Send notification to each customer
      // For better debugging, we'll use both private and public channels
      const notificationPromises = customers.map(async (customer) => {
        // Private channel (authenticated)
        const privateChannel = `private-client-${customer.customer_id}`;

        // Public channel (for testing, no authentication required)
        const publicChannel = `customer-${customer.customer_id}`;

        try {
          // Try both private and public channels for better coverage
          // Private channel with authentication
          await pusherServer.trigger(
            privateChannel,
            "new-machine-added",
            notificationData
          );

          // Public channel as fallback/testing
          await pusherServer.trigger(
            publicChannel,
            "new-machine-added",
            notificationData
          );

          console.log(
            `[Add Machine] Notification sent to customer ${customer.customer_id}`
          );

          // Create notification in database for later viewing
          await Notification.create({
            recipient_id: customer.customer_id,
            recipient_type: "customer",
            message: `New ${machine.type} machine added by ${updatedShop.name}!`,
            type: "new_machine",
            data: notificationData,
            read: false,
            timestamp: new Date(),
          });

          return true;
        } catch (pushError) {
          console.error(
            `[Add Machine] Error notifying customer ${customer.customer_id}:`,
            pushError
          );
          return false;
        }
      });

      // 4. Wait for all notifications to be sent
      await Promise.allSettled(notificationPromises);

      // 5. Additionally, send to public channels for all customers
      await pusherServer.trigger(
        "new-machines", // Public channel for all machine updates
        "machine-added",
        {
          ...notificationData,
          message: `${updatedShop.name} just added a new ${machine.type} machine!`,
        }
      );

      // Also send to a test channel for easier debugging
      await pusherServer.trigger(
        "test-machine-notifications", // Simple test channel
        "new-machine-added",
        {
          ...notificationData,
          message: `New ${machine.type} machine added by ${updatedShop.name}`,
        }
      );

      console.log(
        `[Add Machine] Successfully notified customers about new machine`
      );
    } catch (notificationError) {
      console.error(
        `[Add Machine] Error in notification process:`,
        notificationError
      );
      // Don't fail the request if notifications fail
    }

    // Return the updated machines array
    return NextResponse.json({
      message: "Machine added successfully",
      machines: updatedShop.machines, // Return the updated machines array
      shop: updatedShop,
      admin: updatedAdmin,
    });
  } catch (error) {
    console.error("Error adding machine:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
