import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Admin } from "@/app/models/Admin"; // Assuming your model is named Admin
import { Shop } from "@/app/models/Shop"; // Import the Shop model

// --- Optional: GET Handler (if you need to fetch admin data separately) ---
export async function GET(request: NextRequest, context: any) {
  const { admin_id } = context.params;
  try {
    await dbConnect();
    const admin = await Admin.findOne({ admin_id }).lean(); // Use lean for performance
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Admin not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, admin });
  } catch (error) {
    console.error("Error fetching admin:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch admin" },
      { status: 500 }
    );
  }
}

// --- PUT Handler for Updates (Modified for Add/Delete Payment Methods) ---
export async function PUT(request: NextRequest, context: any) {
  const { admin_id } = context.params;
  let updateData;

  try {
    updateData = await request.json();
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (!updateData || typeof updateData !== "object") {
    return NextResponse.json(
      { success: false, error: "Invalid update data format" },
      { status: 400 }
    );
  }

  try {
    await dbConnect();

    const admin = await Admin.findOne({ admin_id });
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Admin not found" },
        { status: 404 }
      );
    }

    const adminUpdates: Record<string, any> = {};
    const shopUpdates: Record<string, any> = {};
    let shop_id_to_update: string | null = null;

    // --- Populate Admin-specific updates ---
    if (updateData.admin?.name !== undefined)
      adminUpdates.name = updateData.admin.name;

    // --- Populate Shop-related updates ---
    if (admin.shops && admin.shops.length > 0) {
      const shopPrefix = "shops.0.";
      shop_id_to_update = admin.shops[0].shop_id;

      // Phone
      if (updateData.shop?.phone !== undefined) {
        adminUpdates[shopPrefix + "phone"] = updateData.shop.phone;
        shopUpdates.phone = updateData.shop.phone;
      }
      // Address
      if (updateData.shop?.address !== undefined) {
        adminUpdates[shopPrefix + "address"] = updateData.shop.address;
        shopUpdates.address = updateData.shop.address;
      }

      // --- Payment Methods Update (Replace Array Logic) ---
      if (
        updateData.shop?.payment_methods &&
        Array.isArray(updateData.shop.payment_methods)
      ) {
        // Get current max method_id to generate new ones
        const currentPaymentMethods = admin.shops[0].payment_methods || [];
        let maxId = 0;
        currentPaymentMethods.forEach((pm: any) => {
          if (pm.method_id > maxId) {
            maxId = pm.method_id;
          }
        });

        // Process incoming array: assign IDs to new methods
        const finalPaymentMethods = updateData.shop.payment_methods
          .map(
            (pm: {
              method_id?: number; // May be missing for new methods
              name?: string;
              account_number?: string;
            }) => {
              // Basic validation: require name and account_number
              if (!pm.name || pm.account_number === undefined) {
                return null; // Skip invalid/incomplete entries
              }

              let newId = pm.method_id;
              if (newId === undefined || newId <= 0) {
                // Assign a new ID if missing or invalid (e.g., temporary frontend ID)
                maxId++;
                newId = maxId;
              }

              return {
                method_id: newId,
                name: pm.name.trim(), // Trim whitespace
                account_number: pm.account_number,
                // status: pm.status || "active", // Default status if needed
              };
            }
          )
          .filter((pm: any): pm is object => pm !== null); // Remove null entries

        // Use $set to replace the entire array in both documents
        adminUpdates[shopPrefix + "payment_methods"] = finalPaymentMethods;
        shopUpdates.payment_methods = finalPaymentMethods;
      }
      // --- End Payment Methods Update ---
    } else if (updateData.shop && Object.keys(updateData.shop).length > 0) {
      console.warn(
        `Admin ${admin_id} has no shops array, cannot update shop details.`
      );
    }

    // --- Perform Updates ---
    let updatedAdmin = null;
    let updatedShop = null;

    // Update Admin document
    if (Object.keys(adminUpdates).length > 0) {
      updatedAdmin = await Admin.findOneAndUpdate(
        { admin_id },
        { $set: adminUpdates },
        { new: true, runValidators: true }
      );
      if (!updatedAdmin) throw new Error("Failed to apply updates to admin.");
    } else {
      updatedAdmin = admin;
    }

    // Update Shop document
    if (Object.keys(shopUpdates).length > 0 && shop_id_to_update) {
      updatedShop = await Shop.findOneAndUpdate(
        { shop_id: shop_id_to_update },
        { $set: shopUpdates },
        { new: true, runValidators: true }
      );
      if (!updatedShop) {
        console.warn(
          `Shop with shop_id ${shop_id_to_update} not found in Shop collection.`
        );
        // Consider if this should be a hard error depending on requirements
      }
    }

    // Check if any update actually happened
    if (
      Object.keys(adminUpdates).length === 0 &&
      Object.keys(shopUpdates).length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "No valid fields provided for update" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, admin: updatedAdmin });
  } catch (error: any) {
    // ... existing error handling ...
    console.error("Error updating admin/shop:", error);
    if (error.name === "ValidationError") {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to update admin/shop" },
      { status: 500 }
    );
  }
}
