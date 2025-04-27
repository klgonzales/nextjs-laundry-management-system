import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Shop } from "@/app/models/Shop";
import { Admin } from "@/app/models/Admin";
import { Customer } from "@/app/models/Customer"; // Add this import
import { pusherServer } from "@/app/lib/pusherServer"; // Add this import
import { Notification } from "@/app/models/Notification"; // Add if you have a Notification model

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { shop_id, service } = await request.json();

    // Add the new service to the services array in the Shop collection
    const updatedShop = await Shop.findOneAndUpdate(
      { shop_id },
      {
        $push: {
          services: {
            service_id: service.service_id,
            name: service.name,
            description: service.description,
            price_per_kg: service.price_per_kg,
          },
        },
      },
      { new: true }
    );

    if (!updatedShop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Update the services array in the Admin document
    const updatedAdmin = await Admin.findOneAndUpdate(
      { "shops.shop_id": shop_id },
      {
        $set: {
          "shops.$.services": updatedShop.services, // Sync the services array
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

    // Notify all customers about the new service
    try {
      // 1. Get all customers who have ordered from this shop
      const customers = await Customer.find({
        "orders.shop": shop_id,
      }).select("customer_id");

      console.log(
        `[Add Service] Found ${customers.length} customers to notify`
      );

      // 2. Create notification data
      const notificationData = {
        shop_id,
        shop_name: updatedShop.name,
        service: {
          service_id: service.service_id,
          name: service.name,
          description: service.description,
          price_per_kg: service.price_per_kg,
        },
        timestamp: new Date().toISOString(),
      };

      // 3. Send notification to each customer via Pusher
      const notificationPromises = customers.map(async (customer) => {
        const customerChannel = `private-customer-${customer.customer_id}`;

        try {
          // Trigger Pusher event
          await pusherServer.trigger(
            customerChannel,
            "new-service-added",
            notificationData
          );

          // Optionally create notification record in database

          await Notification.create({
            recipient_id: customer.customer_id,
            recipient_type: "customer",
            message: `New service "${service.name}" added by ${updatedShop.name}!`,
            type: "new_service",
            data: notificationData,
            read: false,
            timestamp: new Date(),
          });

          return true;
        } catch (pushError) {
          console.error(
            `[Add Service] Error notifying customer ${customer.customer_id}:`,
            pushError
          );
          return false;
        }
      });

      // 4. Wait for all notifications to be sent
      await Promise.allSettled(notificationPromises);

      // 5. Send to a global channel for all customers
      await pusherServer.trigger(
        "new-services", // Public channel that all customers can subscribe to
        "service-added",
        {
          ...notificationData,
          message: `${updatedShop.name} just added a new service: ${service.name}`,
        }
      );

      console.log(
        `[Add Service] Successfully notified customers about new service`
      );
    } catch (notificationError) {
      console.error(
        `[Add Service] Error in notification process:`,
        notificationError
      );
      // Don't fail the request if notifications fail
    }

    return NextResponse.json({
      message: "Service added successfully",
      shop: updatedShop,
      admin: updatedAdmin,
    });
  } catch (error) {
    console.error("Error adding service:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
