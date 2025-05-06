"use client";
import { useAuth } from "@/app/context/AuthContext"; // Import useAuth
import { useState } from "react";
import {
  FiPlusCircle,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiX,
  FiSpeaker,
  FiClock,
  FiTablet,
  FiDollarSign,
  FiCalendar,
  FiInfo,
} from "react-icons/fi";

export default function Machines() {
  const { user } = useAuth();
  const [machines, setMachines] = useState(user?.shops?.[0]?.machines || []); // Get machines from the first shop
  const [editingIndex, setEditingIndex] = useState<number | null>(null); // Track which machine is being edited
  const [editedMachine, setEditedMachine] = useState<any>(null); // Store the edited machine
  const [isAdding, setIsAdding] = useState(false); // Track if adding a new machine
  const [newMachine, setNewMachine] = useState<any>({
    machine_id: "",
    minimum_kg: 0,
    minimum_minutes: 0,
    price_per_minimum_kg: 0,
    availability: [],
    appointments: [],
    type: "",
  }); // Store the new machine details
  const [error, setError] = useState<string>("");

  const handleAddMachine = async () => {
    if (
      !newMachine.machine_id ||
      !newMachine.minimum_kg ||
      !newMachine.minimum_minutes ||
      !newMachine.type ||
      !newMachine.price_per_minimum_kg
    ) {
      setError("Please fill out all fields for the new machine.");
      return;
    }

    try {
      // Automatically set machine availability to match shop opening hours
      const machineAvailability = (user?.shops?.[0]?.opening_hours || []).map(
        (hours: any) => ({
          date: hours.day || "", // Use the day property from opening_hours
          open: hours.open || "00:00", // Use the open property or default to "00:00"
          close: hours.close || "00:00", // Use the close property or default to "00:00"
        })
      );

      console.log("Machine availability:", machineAvailability);
      const machineToAdd = {
        ...newMachine,
        availability: machineAvailability, // Set availability based on shop opening hours
        appointments: [], // Initialize appointments as an empty array
      };

      // Call the API to add the new machine
      const response = await fetch(`/api/admin/add-machine`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shop_id: user?.shops?.[0]?.shop_id, // Pass the shop ID
          machine: machineToAdd, // Pass the new machine details with availability
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add machine");
      }

      const data = await response.json();

      // Update the local state with the updated machines array
      setMachines(data.machines);

      // Reset the form and state
      setIsAdding(false);
      setNewMachine({
        machine_id: "",
        minimum_kg: 0,
        minimum_minutes: 0,
        price_per_minimum_kg: 0,
        availability: [],
        appointments: [],
        type: "",
      });
      setError("");
    } catch (error) {
      console.error("Error adding machine:", error);
      setError("An error occurred while adding the machine.");
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditedMachine({ ...machines[index] }); // Clone the machine being edited
  };

  const handleSave = async () => {
    if (editingIndex === null) return;

    try {
      // Call the API to update the machine
      const response = await fetch(`/api/admin/update-machine`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shop_id: user?.shops?.[0]?.shop_id, // Pass the shop ID
          machine: editedMachine, // Pass the updated machine
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update machine");
      }

      // Update the local state
      const updatedMachines = [...machines];
      updatedMachines[editingIndex] = editedMachine;
      setMachines(updatedMachines);

      // Reset editing state
      setEditingIndex(null);
      setEditedMachine(null);
    } catch (error) {
      console.error("Error updating machine:", error);
    }
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditedMachine(null);
  };

  const handleDelete = async (machine_id: string) => {
    try {
      // Call the API to delete the machine
      const response = await fetch(`/api/admin/delete-machine`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shop_id: user?.shops?.[0]?.shop_id, // Pass the shop ID
          machine_id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete machine");
      }

      // Update the local state
      const updatedMachines = machines.filter(
        (machine) => machine.machine_id !== machine_id
      );
      setMachines(updatedMachines);
    } catch (error) {
      console.error("Error deleting machine:", error);
    }
  };

  const handleAddAvailability = () => {
    setEditedMachine({
      ...editedMachine,
      availability: [
        ...editedMachine.availability,
        { date: "", open: "", close: "" }, // Add a new empty slot
      ],
    });
  };

  const handleDeleteAvailability = (slotIndex: number) => {
    const updatedAvailability = editedMachine.availability.filter(
      (_: any, index: number) => index !== slotIndex
    );
    setEditedMachine({
      ...editedMachine,
      availability: updatedAvailability,
    });
  };

  return (
    <div className="mt-8 bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Machines
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Manage your laundry machines and availability
        </p>
      </div>
      <div className="border-t border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          {/* Machine Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {machines.map((machine: any, index: number) => (
              <div
                key={index}
                className="relative bg-white rounded-lg shadow-sm border border-gray-100 p-5 transition-shadow hover:shadow-md"
              >
                {editingIndex === index ? (
                  /* Edit Mode */
                  <div className="space-y-3">
                    <div className="flex items-center mb-2">
                      <FiSpeaker className="h-5 w-5 text-[#3D4EB0] mr-2" />
                      <h4 className="font-medium text-[#3D4EB0]">
                        Edit Machine
                      </h4>
                    </div>

                    <input
                      type="text"
                      value={editedMachine.machine_id}
                      onChange={(e) =>
                        setEditedMachine({
                          ...editedMachine,
                          machine_id: e.target.value,
                        })
                      }
                      className="block w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#FFB6E2]"
                      placeholder="Machine ID"
                    />

                    <input
                      type="text"
                      value={editedMachine.type}
                      onChange={(e) =>
                        setEditedMachine({
                          ...editedMachine,
                          type: e.target.value,
                        })
                      }
                      className="block w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#FFB6E2]"
                      placeholder="Machine Type"
                    />

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mb-1">
                          Minimum KG
                        </div>
                        <input
                          type="number"
                          value={editedMachine.minimum_kg}
                          onChange={(e) =>
                            setEditedMachine({
                              ...editedMachine,
                              minimum_kg: Number(e.target.value),
                            })
                          }
                          className="block w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#FFB6E2]"
                          placeholder="Minimum KG"
                        />
                      </div>

                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mb-1">
                          Minimum Minutes
                        </div>
                        <input
                          type="number"
                          value={editedMachine.minimum_minutes}
                          onChange={(e) =>
                            setEditedMachine({
                              ...editedMachine,
                              minimum_minutes: Number(e.target.value),
                            })
                          }
                          className="block w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#FFB6E2]"
                          placeholder="Minutes"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">
                        Price per Min. KG (₱)
                      </div>
                      <input
                        type="number"
                        value={editedMachine.price_per_minimum_kg}
                        onChange={(e) =>
                          setEditedMachine({
                            ...editedMachine,
                            price_per_minimum_kg: Number(e.target.value),
                          })
                        }
                        className="block w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#FFB6E2]"
                        placeholder="Price"
                      />
                    </div>

                    <div className="pt-2">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-xs font-medium text-gray-700">
                          Availability
                        </div>
                        <button
                          onClick={handleAddAvailability}
                          className="btn btn-sm btn-tertiary flex items-center text-xs"
                        >
                          <FiPlusCircle className="mr-1" /> Add
                        </button>
                      </div>

                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {editedMachine.availability.map(
                          (slot: any, slotIndex: number) => (
                            <div
                              key={slotIndex}
                              className="flex items-center space-x-2 bg-gray-50 p-1 rounded"
                            >
                              <input
                                type="text"
                                value={slot.date}
                                onChange={(e) => {
                                  const updatedAvailability = [
                                    ...editedMachine.availability,
                                  ];
                                  updatedAvailability[slotIndex].date =
                                    e.target.value;
                                  setEditedMachine({
                                    ...editedMachine,
                                    availability: updatedAvailability,
                                  });
                                }}
                                className="flex-1 p-1 border border-gray-200 rounded text-xs"
                                placeholder="Day"
                              />
                              <input
                                type="time"
                                value={slot.open}
                                onChange={(e) => {
                                  const updatedAvailability = [
                                    ...editedMachine.availability,
                                  ];
                                  updatedAvailability[slotIndex].open =
                                    e.target.value;
                                  setEditedMachine({
                                    ...editedMachine,
                                    availability: updatedAvailability,
                                  });
                                }}
                                className="w-24 p-1 border border-gray-200 rounded text-xs"
                              />
                              <input
                                type="time"
                                value={slot.close}
                                onChange={(e) => {
                                  const updatedAvailability = [
                                    ...editedMachine.availability,
                                  ];
                                  updatedAvailability[slotIndex].close =
                                    e.target.value;
                                  setEditedMachine({
                                    ...editedMachine,
                                    availability: updatedAvailability,
                                  });
                                }}
                                className="w-24 p-1 border border-gray-200 rounded text-xs"
                              />
                              <button
                                onClick={() =>
                                  handleDeleteAvailability(slotIndex)
                                }
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <FiX size={14} />
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-4">
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
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center">
                        <div className="h-9 w-9 bg-[#EADDFF] rounded-full flex items-center justify-center mr-2">
                          <FiSpeaker className="h-4 w-4 text-[#3D4EB0]" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {machine.machine_id}
                          </h4>
                          <div className="badge badge-primary">
                            {machine.type}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleEdit(index)}
                          className="btn btn-sm btn-tertiary flex items-center"
                          aria-label="Edit machine"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(machine.machine_id)}
                          className="btn btn-sm btn-danger flex items-center"
                          aria-label="Delete machine"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 mb-4">
                      <div className="flex items-center">
                        <FiTablet className="h-3.5 w-3.5 text-gray-500 mr-1" />
                        <span className="text-sm text-gray-600">
                          {machine.minimum_kg} kg min.
                        </span>
                      </div>
                      <div className="flex items-center">
                        <FiClock className="h-3.5 w-3.5 text-gray-500 mr-1" />
                        <span className="text-sm text-gray-600">
                          {machine.minimum_minutes} mins
                        </span>
                      </div>
                      <div className="flex items-center col-span-2">
                        <FiDollarSign className="h-3.5 w-3.5 text-gray-500 mr-1" />
                        <span className="text-sm text-gray-600">
                          ₱{machine.price_per_minimum_kg}/kg
                        </span>
                      </div>
                    </div>

                    {/* Availability */}
                    <div className="mb-3">
                      <div className="flex items-center text-xs font-medium text-gray-700 mb-1">
                        <FiCalendar className="h-3 w-3 mr-1" /> Availability
                      </div>
                      <div className="max-h-24 overflow-y-auto">
                        {machine.availability &&
                        machine.availability.length > 0 ? (
                          <div className="text-xs text-gray-600 space-y-1">
                            {machine.availability.map(
                              (slot: any, slotIndex: number) => (
                                <div
                                  key={slotIndex}
                                  className="flex justify-between bg-gray-50 p-1 rounded"
                                >
                                  <span className="font-medium">
                                    {slot.date}
                                  </span>
                                  <span>
                                    {slot.open} - {slot.close}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">
                            No availability set
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* Add Machine Card */}
            {!isAdding ? (
              <div
                onClick={() => setIsAdding(true)}
                className="bg-white rounded-lg border border-dashed border-[#F468BB] p-5 flex flex-col items-center justify-center h-full min-h-[300px] cursor-pointer hover:bg-[#F9F9F9] transition-colors"
              >
                <FiPlusCircle className="h-12 w-12 text-[#F468BB] mb-2" />
                <span className="text-[#F468BB] font-medium">Add Machine</span>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center mb-4">
                  <FiSpeaker className="h-5 w-5 text-[#3D4EB0] mr-2" />
                  <h4 className="text-lg font-medium text-[#3D4EB0]">
                    New Machine
                  </h4>
                </div>

                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-3 mb-4 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  <input
                    type="text"
                    value={newMachine.machine_id}
                    onChange={(e) =>
                      setNewMachine({
                        ...newMachine,
                        machine_id: e.target.value,
                      })
                    }
                    className="block w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#FFB6E2]"
                    placeholder="Machine ID"
                  />

                  <input
                    type="text"
                    value={newMachine.type}
                    onChange={(e) =>
                      setNewMachine({ ...newMachine, type: e.target.value })
                    }
                    className="block w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#FFB6E2]"
                    placeholder="Machine Type"
                  />

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 mb-1">
                        Minimum KG
                      </div>
                      <input
                        type="number"
                        value={newMachine.minimum_kg}
                        onChange={(e) =>
                          setNewMachine({
                            ...newMachine,
                            minimum_kg: Number(e.target.value),
                          })
                        }
                        className="block w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#FFB6E2]"
                        placeholder="Minimum KG"
                      />
                    </div>

                    <div className="flex-1">
                      <div className="text-xs text-gray-500 mb-1">
                        Minimum Minutes
                      </div>
                      <input
                        type="number"
                        value={newMachine.minimum_minutes}
                        onChange={(e) =>
                          setNewMachine({
                            ...newMachine,
                            minimum_minutes: Number(e.target.value),
                          })
                        }
                        className="block w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#FFB6E2]"
                        placeholder="Minutes"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 mb-1">
                      Price per Min. KG (₱)
                    </div>
                    <input
                      type="number"
                      value={newMachine.price_per_minimum_kg}
                      onChange={(e) =>
                        setNewMachine({
                          ...newMachine,
                          price_per_minimum_kg: Number(e.target.value),
                        })
                      }
                      className="block w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#FFB6E2]"
                      placeholder="Price"
                    />
                  </div>

                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    <div className="flex items-center mb-1">
                      <FiInfo className="h-3 w-3 mr-1" />
                      <span className="font-medium">Note:</span>
                    </div>
                    Availability will be automatically set from your shop's
                    opening hours. You can edit this after creating the machine.
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={handleAddMachine}
                      className="btn btn-success flex items-center"
                    >
                      <FiCheck className="mr-1" /> Save
                    </button>
                    <button
                      onClick={() => {
                        setIsAdding(false);
                        setError("");
                      }}
                      className="btn btn-danger flex items-center"
                    >
                      <FiX className="mr-1" /> Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {machines.length === 0 && !isAdding && (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No machines available</p>
              <button
                onClick={() => setIsAdding(true)}
                className="btn btn-primary flex items-center mx-auto"
              >
                <FiPlusCircle className="mr-2" /> Add Your First Machine
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
