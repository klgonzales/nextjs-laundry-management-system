import { useAuth } from "@/app/context/AuthContext"; // Import useAuth
import { useState } from "react";

export default function Services() {
  const { user } = useAuth();
  const [services, setServices] = useState(user?.shops?.[0]?.services || []); // Get services from the first shop
  const [editingIndex, setEditingIndex] = useState<number | null>(null); // Track which service is being edited
  const [editedService, setEditedService] = useState<any>(null); // Store the edited service

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
      </div>
      <div className="border-t border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          {services.length > 0 ? (
            <ul className="space-y-4">
              {services.map((service: any, index: number) => (
                <li
                  key={index}
                  className="p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200"
                >
                  {editingIndex === index ? (
                    <div>
                      <input
                        type="text"
                        value={editedService.name}
                        onChange={(e) =>
                          setEditedService({
                            ...editedService,
                            name: e.target.value,
                          })
                        }
                        className="block w-full mb-2 p-2 border rounded"
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
                        className="block w-full mb-2 p-2 border rounded"
                        placeholder="Service Description"
                      />
                      <input
                        type="number"
                        value={editedService.price_per_kg}
                        onChange={(e) =>
                          setEditedService({
                            ...editedService,
                            price_per_kg: Number(e.target.value),
                          })
                        }
                        className="block w-full mb-2 p-2 border rounded"
                        placeholder="Price per kg"
                      />
                      <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-green-500 text-white rounded mr-2"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="px-4 py-2 bg-gray-500 text-white rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800">
                        {service.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {service.description || "No description available"}
                      </p>
                      <p className="text-sm text-gray-600">
                        Price per kg:{" "}
                        {service.price_per_kg > 0
                          ? `₱${service.price_per_kg}`
                          : "Not applicable"}
                      </p>
                      <button
                        onClick={() => handleEdit(index)}
                        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(service.service_id)}
                        className="mt-2 px-4 py-2 bg-red-500 text-white rounded"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-center">No available services</p>
          )}
        </div>
      </div>
    </div>
  );
}
