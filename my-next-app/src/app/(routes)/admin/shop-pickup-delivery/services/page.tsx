"use client";
import { useAuth } from "@/app/context/AuthContext";
import { useState } from "react";
import {
  FiPlusCircle,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiX,
  FiWind,
  FiPackage,
  FiShoppingBag,
  FiDollarSign,
  FiInfo,
} from "react-icons/fi";

export default function Services() {
  const { user } = useAuth();
  const [services, setServices] = useState(user?.shops?.[0]?.services || []);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedService, setEditedService] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newService, setNewService] = useState({
    service_id: Math.floor(Math.random() * 1000000),
    name: "",
    price_per_kg: 0,
    description: "",
  });

  // Helper function to get appropriate icon for a service
  const getServiceIcon = (serviceName: string) => {
    const name = serviceName.toLowerCase();
    if (name.includes("wash")) return <FiWind className="h-6 w-6" />;
    if (name.includes("iron")) return <FiPackage className="h-6 w-6" />;
    if (name.includes("dry")) return <FiShoppingBag className="h-6 w-6" />;
    if (name.includes("fold")) return <FiPackage className="h-6 w-6" />;
    return <FiInfo className="h-6 w-6" />;
  };

  const handleAddService = async () => {
    try {
      // Call the API to add the new service
      const response = await fetch(`/api/admin/add-service`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shop_id: user?.shops?.[0]?.shop_id, // Pass the shop ID
          service: newService, // Pass the new service details
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add service");
      }

      const data = await response.json();

      // Update the local state with the updated services array
      setServices(data.shop.services);

      // Reset the form and state
      setIsAdding(false);
      setNewService({
        service_id: Math.floor(Math.random() * 1000000), // Generate a new random service ID
        name: "Fold",
        price_per_kg: 0,
        description: "Fold service",
      });
    } catch (error) {
      console.error("Error adding service:", error);
    }
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewService({
      service_id: Math.floor(Math.random() * 1000000),
      name: "Fold",
      price_per_kg: 0,
      description: "Fold service",
    });
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditedService({ ...services[index] }); // Clone the service being edited
  };

  const handleSave = async () => {
    if (editingIndex === null) return;

    try {
      // Call the API to update the service
      const response = await fetch(`/api/admin/update-service`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shop_id: user?.shops?.[0]?.shop_id, // Pass the shop ID
          service: editedService, // Pass the updated service
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update service");
      }

      // Update the local state
      const updatedServices = [...services];
      updatedServices[editingIndex] = editedService;
      setServices(updatedServices);

      // Reset editing state
      setEditingIndex(null);
      setEditedService(null);
    } catch (error) {
      console.error("Error updating service:", error);
    }
  };

  const handleDelete = async (service_id: number) => {
    try {
      const response = await fetch(`/api/admin/delete-service`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shop_id: user?.shops?.[0]?.shop_id, // Pass the shop ID
          service_id, // Pass the service ID
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete service");
      }

      // Update the local state
      const updatedServices = services.filter(
        (service) => service.service_id !== service_id
      );
      setServices(updatedServices);
    } catch (error) {
      console.error("Error deleting service:", error);
    }
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditedService(null);
  };

  return (
    <div className="mt-8 bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Services
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Manage your laundry services and pricing
        </p>
      </div>

      <div className="border-t border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          {/* Service Cards Grid */}
          {/* Service Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            {services.map((service: any, index: number) => (
              <div
                key={index}
                className="relative bg-white rounded-lg shadow-sm border border-gray-100 p-5 transition-shadow hover:shadow-md"
              >
                {editingIndex === index ? (
                  /* Edit Mode */
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editedService.name}
                      onChange={(e) =>
                        setEditedService({
                          ...editedService,
                          name: e.target.value,
                        })
                      }
                      className="block w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#FFB6E2]"
                      placeholder="Service Name"
                    />
                    <textarea
                      value={editedService.description}
                      onChange={(e) =>
                        setEditedService({
                          ...editedService,
                          description: e.target.value,
                        })
                      }
                      className="block w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#FFB6E2]"
                      placeholder="Service Description"
                      rows={3}
                    />
                    <div className="flex items-center">
                      <input
                        type="number"
                        value={editedService.price_per_kg}
                        onChange={(e) =>
                          setEditedService({
                            ...editedService,
                            price_per_kg: Number(e.target.value),
                          })
                        }
                        className="block w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#FFB6E2]"
                        placeholder="Price per kg"
                      />
                    </div>
                    <div className="flex space-x-2 pt-2">
                      <button
                        onClick={handleSave}
                        className="btn btn-success flex items-center"
                      >
                        <FiCheck className="mr-1" /> Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="btn btn-danger flex items-center"
                      >
                        <FiX className="mr-1" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display Mode */
                  <>
                    <div className="flex flex-col items-start mb-3">
                      <h4 className="font-medium text-gray-900">
                        {service.name}
                      </h4>
                      <div className="flex items-center text-sm font-medium text-[#F468BB] bg-[#F9F9F9] mb-3">
                        {service.price_per_kg > 0
                          ? `₱${service.price_per_kg} per kg`
                          : "Price not set"}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-2 h-12 overflow-hidden">
                      {service.description || "No description available"}
                    </p>

                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(index)}
                        className="btn btn-tertiary flex items-center"
                      >
                        <FiEdit2 className="mr-1" />
                      </button>
                      <button
                        onClick={() => handleDelete(service.service_id)}
                        className="btn btn-danger flex items-center"
                      >
                        <FiTrash2 className="mr-1" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* Add Service Card */}
            {!isAdding ? (
              <div
                onClick={() => setIsAdding(true)}
                className="bg-white rounded-lg border border-dashed border-[#F468BB] p-5 flex flex-col items-center justify-center h-full cursor-pointer hover:bg-[#F9F9F9] transition-colors"
              >
                <FiPlusCircle className="h-12 w-12 text-[#F468BB] mb-2" />
                <span className="text-[#F468BB] font-medium">Add Service</span>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                <h4 className="text-lg font-medium text-[#3D4EB0] mb-3">
                  New Service
                </h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newService.name}
                    onChange={(e) =>
                      setNewService({ ...newService, name: e.target.value })
                    }
                    className="block w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#FFB6E2]"
                    placeholder="Service Name"
                  />
                  <textarea
                    value={newService.description}
                    onChange={(e) =>
                      setNewService({
                        ...newService,
                        description: e.target.value,
                      })
                    }
                    className="block w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#FFB6E2]"
                    placeholder="Service Description"
                    rows={3}
                  />
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={newService.price_per_kg}
                      onChange={(e) =>
                        setNewService({
                          ...newService,
                          price_per_kg: Number(e.target.value),
                        })
                      }
                      className="block w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#FFB6E2]"
                      placeholder="Price per kg"
                    />
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={handleAddService}
                      className="btn btn-success flex items-center"
                    >
                      <FiCheck className="mr-1" /> Save
                    </button>
                    <button
                      onClick={handleCancelAdd}
                      className="btn btn-danger flex items-center"
                    >
                      <FiX className="mr-1" /> Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {services.length === 0 && !isAdding && (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No services available</p>
              <button
                onClick={() => setIsAdding(true)}
                className="btn btn-primary flex items-center mx-auto"
              >
                <FiPlusCircle className="mr-2" /> Add Your First Service
              </button>
            </div>
          )}

          {services.length === 0 && !isAdding && (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No services available</p>
              <button
                onClick={() => setIsAdding(true)}
                className="btn btn-primary flex items-center mx-auto"
              >
                <FiPlusCircle className="mr-2" /> Add Your First Service
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
