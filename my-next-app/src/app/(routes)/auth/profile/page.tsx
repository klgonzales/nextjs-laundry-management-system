"use client";

import { useState, useEffect } from "react";
import BackButton from "@/app/components/common/Home";
import { useAuth } from "@/app/context/AuthContext"; // Correct path
import { FiDelete, FiEdit, FiTrash } from "react-icons/fi";

export default function Profile() {
  // Get user and login function from context
  const { user, login } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "", // Keep for display, but don't send in update
    phone: "",
    address: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false); // Local loading state for save operation

  // Initialize form data when user data is available
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        // Ensure phone is treated as string for input field
        phone: user.phone?.toString() || "",
        address: user.address || "",
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Function to handle saving the updated profile data
  const handleSave = async () => {
    // Ensure user and customer_id exist (assuming customer profile)
    // Adjust this check if admins also use this profile page and have a different ID structure
    if (!user || !user.customer_id) {
      setError(
        "User data or Customer ID is not available. Cannot update profile."
      );
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSaving(true);

    // Prepare only the data allowed for update
    const updatePayload = {
      name: formData.name,
      phone: formData.phone, // Send as string, API/DB might handle conversion
      address: formData.address,
    };

    try {
      const response = await fetch(`/api/customers/${user.customer_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `API Error: ${response.statusText}`);
      }

      // --- Success ---
      setSuccess("Profile updated successfully!");
      setIsEditing(false);

      // Update the user data in the AuthContext and localStorage
      if (result.customer) {
        // Construct the updated user object based on the API response
        // Important: Keep existing fields from the original user object
        // that were not part of the update (like email, role, id, etc.)
        const updatedUser = {
          ...user, // Spread existing user data
          name: result.customer.name,
          phone: result.customer.phone, // Assuming API returns the correct type
          address: result.customer.address,
        };
        login(updatedUser); // Update context and localStorage
      }
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  // Display message if user is not logged in (Auth context handles initial loading implicitly)
  if (!user) {
    return (
      <div className="mt-8 text-center">
        <p>Please log in to view your profile.</p>
        {/* Optionally add a login button/link here */}
      </div>
    );
  }

  // --- Render Profile View ---
  return (
    <div className="mt-8 max-w-4xl mx-auto bg-white shadow rounded-lg mb-10 w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5 sm:px-6 border-b border-gray-200">
        <div className="flex items-center">
          <BackButton href="/auth/dashboard" /> {/* Adjust href as needed */}
          <h3 className="ml-4 text-lg leading-6 font-medium text-gray-900 w-full">
            Profile
          </h3>
        </div>
        <button
          onClick={() => {
            setIsEditing(!isEditing);
            setError(null);
            setSuccess(null);
            // Reset form if cancelling edit
            if (isEditing && user) {
              setFormData({
                name: user.name || "",
                email: user.email || "",
                phone: user.phone?.toString() || "",
                address: user.address || "",
              });
            }
          }}
          className={`px-3 py-1 rounded text-sm font-medium ${isEditing ? "bg-gray-200 text-gray-700 hover:bg-gray-300" : "bg-[#FFB6E2] text-black hover:bg-[#F38AC9]"}`}
        >
          {isEditing ? "Cancel" : <FiEdit />}
        </button>
      </div>

      {/* Profile Details */}
      <div className="px-4 py-5 sm:p-6">
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {success && <p className="text-green-500 text-sm mb-4">{success}</p>}

        <dl className="space-y-4">
          {/* Name */}
          <div>
            <dt className="text-sm font-medium text-gray-500">Name</dt>
            {isEditing ? (
              <input
                type="text"
                name="name"
                id="name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={isSaving}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 disabled:bg-gray-100"
              />
            ) : (
              <dd className="mt-1 text-sm text-gray-900">{user.name || "-"}</dd>
            )}
          </div>

          {/* Email (Display Only) */}
          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="mt-1 text-sm text-gray-900">{user.email || "-"}</dd>
          </div>

          {/* Phone */}
          <div>
            <dt className="text-sm font-medium text-gray-500">Phone</dt>
            {isEditing ? (
              <input
                type="tel" // Use "tel" for better mobile experience
                name="phone"
                id="phone"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={isSaving}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 disabled:bg-gray-100"
              />
            ) : (
              <dd className="mt-1 text-sm text-gray-900">
                {user.phone || "-"}
              </dd>
            )}
          </div>

          {/* Address */}
          <div>
            <dt className="text-sm font-medium text-gray-500">Address</dt>
            {isEditing ? (
              <input
                type="text"
                name="address"
                id="address"
                value={formData.address}
                onChange={handleInputChange}
                disabled={isSaving}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 disabled:bg-gray-100"
              />
            ) : (
              <dd className="mt-1 text-sm text-gray-900">
                {user.address || "-"}
              </dd>
            )}
          </div>
        </dl>

        {/* Save Button */}
        {isEditing && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving} // Use local saving state
              className="btn btn-primary"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
