"use client";

import { useState, useEffect, ChangeEvent } from "react";
import BackButton from "@/app/components/common/Home";
import { useAuth } from "@/app/context/AuthContext";

// Interface for Payment Method structure within the form
interface PaymentMethodFormData {
  method_id: number; // Use temporary negative ID for new ones before save
  name: string;
  account_number: string;
  isNew?: boolean; // Flag to identify new methods
}

export default function AdminProfile() {
  const { user, login } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [adminFormData, setAdminFormData] = useState({ name: "", email: "" });
  const [shopFormData, setShopFormData] = useState({
    phone: "",
    email: "",
    address: "",
    payment_methods: [] as PaymentMethodFormData[],
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data
  useEffect(() => {
    if (user && user.role === "admin") {
      setAdminFormData({ name: user.name || "", email: user.email || "" });
      const shop = user.shops?.[0];
      if (shop) {
        setShopFormData({
          phone: shop.phone || "",
          email: shop.email || "",
          address: shop.address || "",
          payment_methods:
            shop.payment_methods?.map((pm: any) => ({
              method_id: pm.method_id,
              name: pm.name,
              account_number: pm.account_number?.toString() || "",
              isNew: false, // Mark existing methods
            })) || [],
        });
      } else {
        setShopFormData({
          phone: "",
          email: "",
          address: "",
          payment_methods: [],
        });
      }
    }
  }, [user]);

  // --- Input Handlers ---
  const handleAdminInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAdminFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleShopInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setShopFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Updated handler for payment methods (name and account number)
  const handlePaymentMethodChange = (
    method_id: number, // Can be temporary ID
    field: "name" | "account_number",
    value: string
  ) => {
    setShopFormData((prev) => ({
      ...prev,
      payment_methods: prev.payment_methods.map((pm) =>
        pm.method_id === method_id ? { ...pm, [field]: value } : pm
      ),
    }));
  };

  // --- Add/Delete Payment Method Handlers ---
  const addPaymentMethod = () => {
    setShopFormData((prev) => ({
      ...prev,
      payment_methods: [
        ...prev.payment_methods,
        {
          method_id: -Date.now(), // Temporary unique negative ID for key/delete
          name: "",
          account_number: "",
          isNew: true,
        },
      ],
    }));
  };

  const deletePaymentMethod = (method_id_to_delete: number) => {
    setShopFormData((prev) => ({
      ...prev,
      payment_methods: prev.payment_methods.filter(
        (pm) => pm.method_id !== method_id_to_delete
      ),
    }));
  };

  // --- Save Handler ---
  const handleSave = async () => {
    if (!user || !user.admin_id) {
      setError("Admin data or ID is not available.");
      return;
    }
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    // Prepare payment methods for payload:
    // - Filter out new methods that are still empty (no name)
    // - Send undefined method_id for new methods so backend assigns one
    const paymentMethodsPayload = shopFormData.payment_methods
      .filter((pm) => (pm.isNew ? pm.name.trim() !== "" : true)) // Keep existing, or new ones with a name
      .map((pm) => ({
        method_id: pm.isNew ? undefined : pm.method_id, // Send undefined for new
        name: pm.name.trim(),
        account_number: pm.account_number,
      }));

    const payload = {
      admin: { name: adminFormData.name },
      shop: {
        phone: shopFormData.phone,
        address: shopFormData.address,
        payment_methods: paymentMethodsPayload, // Send processed array
      },
    };

    try {
      const response = await fetch(`/api/admin/${user.admin_id}`, {
        // Correct API path
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || `API Error: ${response.statusText}`);
      }
      setSuccess("Profile updated successfully!");
      setIsEditing(false);
      if (result.admin) {
        login(result.admin); // Update context
      }
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Render Logic ---
  if (!user || user.role !== "admin") {
    return (
      <div className="mt-8 text-center">
        <p>Access denied or user not logged in.</p>
      </div>
    );
  }
  const currentShop = user.shops?.[0];

  return (
    <div className="mt-8 max-w-4xl mx-auto bg-white shadow rounded-lg mb-10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5 sm:px-6 border-b border-gray-200">
        {/* ... (Header content, BackButton logic) ... */}
        <div className="flex items-center">
          {/* Simplified Back Button Logic - Adjust href based on shop type */}
          <BackButton
            href={
              currentShop?.type === "self-service"
                ? "/admin/shop-self-service/dashboard"
                : "/admin/shop-pickup-delivery/dashboard"
            }
          />
          <h3 className="ml-4 text-lg leading-6 font-medium text-gray-900">
            Admin Profile & Shop Settings
          </h3>
        </div>
        <button
          onClick={() => {
            /* ... (Cancel logic - reset forms) ... */
            setIsEditing(!isEditing);
            setError(null);
            setSuccess(null);
            if (isEditing) {
              // Resetting on cancel
              setAdminFormData({
                name: user.name || "",
                email: user.email || "",
              });
              const shop = user.shops?.[0];
              if (shop) {
                setShopFormData({
                  phone: shop.phone || "",
                  email: shop.email || "",
                  address: shop.address || "",
                  payment_methods:
                    shop.payment_methods?.map((pm: any) => ({
                      method_id: pm.method_id,
                      name: pm.name,
                      account_number: pm.account_number?.toString() || "",
                      isNew: false,
                    })) || [],
                });
              } else {
                setShopFormData({
                  phone: "",
                  email: "",
                  address: "",
                  payment_methods: [],
                });
              }
            }
          }}
          className={`px-3 py-1 rounded text-sm font-medium ${isEditing ? "bg-gray-200 text-gray-700 hover:bg-gray-300" : "bg-blue-500 text-white hover:bg-blue-600"}`}
        >
          {isEditing ? "Cancel" : "Edit Profile & Shop"}
        </button>
      </div>

      {/* Profile Details */}
      <div className="px-4 py-5 sm:p-6">
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {success && <p className="text-green-500 text-sm mb-4">{success}</p>}

        {/* Admin Section */}
        {/* ... (Admin Name, Admin Email - Display Only) ... */}
        <section className="mb-8 border-b pb-6">
          <h4 className="text-md font-semibold text-gray-700 mb-3">
            Admin Details
          </h4>
          <dl className="space-y-4">
            {/* Admin Name */}
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={adminFormData.name}
                  onChange={handleAdminInputChange}
                  disabled={isSaving}
                  className="mt-1 input-field"
                />
              ) : (
                <dd className="mt-1 text-sm text-gray-900">
                  {user.name || "-"}
                </dd>
              )}
            </div>
            {/* Admin Email (Display Only) */}
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {user.email || "-"}
              </dd>
            </div>
          </dl>
        </section>

        {/* Shop Section */}
        {currentShop && (
          <section className="mb-8 border-b pb-6">
            {/* ... (Shop Phone, Shop Email - Display Only, Shop Address) ... */}
            <h4 className="text-md font-semibold text-gray-700 mb-3">
              Shop Details ({currentShop.name})
            </h4>
            <dl className="space-y-4">
              {/* Shop Phone */}
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Shop Phone
                </dt>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={shopFormData.phone}
                    onChange={handleShopInputChange}
                    disabled={isSaving}
                    className="mt-1 input-field"
                  />
                ) : (
                  <dd className="mt-1 text-sm text-gray-900">
                    {currentShop.phone || "-"}
                  </dd>
                )}
              </div>
              {/* Shop Email (Display Only) */}
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Shop Email
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {currentShop.email || "-"}
                </dd>
              </div>
              {/* Shop Address */}
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Shop Address
                </dt>
                {isEditing ? (
                  <input
                    type="text"
                    name="address"
                    value={shopFormData.address}
                    onChange={handleShopInputChange}
                    disabled={isSaving}
                    className="mt-1 input-field"
                  />
                ) : (
                  <dd className="mt-1 text-sm text-gray-900">
                    {currentShop.address || "-"}
                  </dd>
                )}
              </div>
            </dl>
          </section>
        )}

        {/* Payment Methods Section */}
        {currentShop && ( // Only show if shop exists
          <section className="mb-8">
            <h4 className="text-md font-semibold text-gray-700 mb-3">
              Payment Methods
            </h4>
            <div className="space-y-4">
              {shopFormData.payment_methods.map((pm) => (
                <div key={pm.method_id} className="flex items-center space-x-2">
                  {" "}
                  {/* Use flex for layout */}
                  <div className="flex-grow">
                    {" "}
                    {/* Allow inputs to take space */}
                    {isEditing ? (
                      <>
                        {/* Name Input (only for new methods) */}
                        {pm.isNew && (
                          <input
                            type="text"
                            value={pm.name}
                            onChange={(e) =>
                              handlePaymentMethodChange(
                                pm.method_id,
                                "name",
                                e.target.value
                              )
                            }
                            disabled={isSaving}
                            placeholder="Payment Method Name (e.g., GCash, Maya)"
                            className="mt-1 input-field mb-1" // Add margin bottom
                          />
                        )}
                        {/* Display name for existing methods */}
                        {!pm.isNew && (
                          <span className="block text-sm font-medium text-gray-600 mb-1">
                            {pm.name}
                          </span>
                        )}
                        {/* Account Number Input */}
                        <input
                          type="text"
                          value={pm.account_number}
                          onChange={(e) =>
                            handlePaymentMethodChange(
                              pm.method_id,
                              "account_number",
                              e.target.value
                            )
                          }
                          disabled={isSaving}
                          placeholder={`${pm.name || "Payment"} Account Number/Details`}
                          className="mt-1 input-field"
                        />
                      </>
                    ) : (
                      <>
                        <dt className="text-sm font-medium text-gray-500">
                          {pm.name}
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {pm.account_number || "-"}
                        </dd>
                      </>
                    )}
                  </div>
                  {/* Delete Button (only in edit mode) */}
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => deletePaymentMethod(pm.method_id)}
                      disabled={isSaving}
                      className="mt-1 px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 disabled:bg-gray-400 self-end mb-1" // Align button nicely
                      aria-label={`Delete ${pm.name || "payment method"}`}
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
            {/* Add Payment Method Button (only in edit mode) */}
            {isEditing && (
              <button
                type="button"
                onClick={addPaymentMethod}
                disabled={isSaving}
                className="mt-4 px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:bg-gray-400"
              >
                + Add Payment Method
              </button>
            )}
          </section>
        )}

        {/* Save Button */}
        {/* ... (Save button logic) ... */}
        {isEditing && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-green-500 text-white rounded text-sm font-medium hover:bg-green-600 disabled:bg-gray-400"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
      {/* Helper class for inputs */}
      {/* ... (style jsx) ... */}
      <style jsx>{`
        .input-field {
          display: block;
          width: 100%;
          border-radius: 0.375rem; /* rounded-md */
          border: 1px solid #d1d5db; /* border-gray-300 */
          box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); /* shadow-sm */
          padding: 0.5rem; /* p-2 */
        }
        .input-field:focus {
          border-color: #3b82f6; /* focus:border-blue-500 */
          outline: 2px solid transparent;
          outline-offset: 2px;
          box-shadow: 0 0 0 2px #bfdbfe; /* focus:ring-blue-500 */
        }
        .input-field:disabled {
          background-color: #f3f4f6; /* disabled:bg-gray-100 */
        }
      `}</style>
    </div>
  );
}
