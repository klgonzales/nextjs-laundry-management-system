import { useAuth } from "@/app/context/AuthContext"; // Import useAuth
import { useState } from "react";

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
  }); // Store the new machine details
  const [error, setError] = useState<string>("");

  const handleAddMachine = async () => {
    if (
      !newMachine.machine_id ||
      !newMachine.minimum_kg ||
      !newMachine.minimum_minutes ||
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

      // Update the local state
      // const addedMachine = await response.json();
      // setMachines([...machines, addedMachine]);

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
      //const machineToDelete = machines[index];

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
      </div>

      {!isAdding ? (
        <button
          onClick={() => setIsAdding(true)}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Add New Machine
        </button>
      ) : (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-lg font-medium text-gray-800 mb-4">
            Add New Machine
          </h4>
          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
          <input
            type="text"
            value={newMachine.machine_id}
            onChange={(e) =>
              setNewMachine({ ...newMachine, machine_id: e.target.value })
            }
            className="block w-full mb-2 p-2 border rounded"
            placeholder="Machine ID"
          />
          <input
            type="number"
            value={newMachine.minimum_kg}
            onChange={(e) =>
              setNewMachine({
                ...newMachine,
                minimum_kg: Number(e.target.value),
              })
            }
            className="block w-full mb-2 p-2 border rounded"
            placeholder="Minimum KG"
          />
          <input
            type="number"
            value={newMachine.minimum_minutes}
            onChange={(e) =>
              setNewMachine({
                ...newMachine,
                minimum_minutes: Number(e.target.value),
              })
            }
            className="block w-full mb-2 p-2 border rounded"
            placeholder="Minimum Minutes"
          />
          <input
            type="number"
            value={newMachine.price_per_minimum_kg}
            onChange={(e) =>
              setNewMachine({
                ...newMachine,
                price_per_minimum_kg: Number(e.target.value),
              })
            }
            className="block w-full mb-2 p-2 border rounded"
            placeholder="Price per Minimum KG"
          />

          <button
            onClick={handleAddMachine}
            className="px-4 py-2 bg-green-500 text-white rounded mr-2"
          >
            Save
          </button>
          <button
            onClick={() => setIsAdding(false)}
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="border-t border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          {machines.length > 0 ? (
            <ul className="space-y-4">
              {machines.map((machine: any, index: number) => (
                <li
                  key={index}
                  className="p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200"
                >
                  {editingIndex === index ? (
                    <div>
                      {/* Editable Fields */}
                      <input
                        type="text"
                        value={editedMachine.machine_id}
                        onChange={(e) =>
                          setEditedMachine({
                            ...editedMachine,
                            machine_id: e.target.value,
                          })
                        }
                        className="block w-full mb-2 p-2 border rounded"
                        placeholder="Machine ID"
                      />
                      <input
                        type="number"
                        value={editedMachine.minimum_kg}
                        onChange={(e) =>
                          setEditedMachine({
                            ...editedMachine,
                            minimum_kg: Number(e.target.value),
                          })
                        }
                        className="block w-full mb-2 p-2 border rounded"
                        placeholder="Minimum KG"
                      />
                      <input
                        type="number"
                        value={editedMachine.minimum_minutes}
                        onChange={(e) =>
                          setEditedMachine({
                            ...editedMachine,
                            minimum_minutes: Number(e.target.value),
                          })
                        }
                        className="block w-full mb-2 p-2 border rounded"
                        placeholder="Minimum Minutes"
                      />
                      <input
                        type="number"
                        value={editedMachine.price_per_minimum_kg}
                        onChange={(e) =>
                          setEditedMachine({
                            ...editedMachine,
                            price_per_minimum_kg: Number(e.target.value),
                          })
                        }
                        className="block w-full mb-2 p-2 border rounded"
                        placeholder="Price per Minimum KG"
                      />
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700">
                          Availability
                        </h4>
                        {editedMachine.availability.map(
                          (slot: any, slotIndex: number) => (
                            <div key={slotIndex} className="flex space-x-2">
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
                                className="block w-1/3 p-2 border rounded"
                                placeholder="Date"
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
                                className="block w-1/3 p-2 border rounded"
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
                                className="block w-1/3 p-2 border rounded"
                              />
                              <button
                                onClick={() =>
                                  handleDeleteAvailability(slotIndex)
                                }
                                className="px-2 py-1 bg-red-500 text-white rounded"
                              >
                                Delete
                              </button>
                            </div>
                          )
                        )}
                        <button
                          onClick={handleAddAvailability}
                          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
                        >
                          Add Availability
                        </button>
                      </div>
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
                      {/* View-Only Fields */}
                      <h4 className="text-lg font-semibold text-gray-800">
                        {machine.machine_id}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Minimum KG: {machine.minimum_kg}
                      </p>
                      <p className="text-sm text-gray-600">
                        Minimum Minutes: {machine.minimum_minutes}
                      </p>
                      <p className="text-sm text-gray-600">
                        Price per Minimum KG: ₱{machine.price_per_minimum_kg}
                      </p>
                      <div className="mb-2">
                        <h4 className="text-sm font-medium text-gray-700">
                          Availability:
                        </h4>
                        <ul className="list-disc list-inside text-sm text-gray-600">
                          {(machine.availability || []).map(
                            (slot: any, slotIndex: number) => (
                              <li key={slotIndex}>
                                {slot.date}: {slot.open} - {slot.close}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                      <div className="mb-2">
                        <h4 className="text-sm font-medium text-gray-700">
                          Appointments:
                        </h4>
                        <ul className="list-disc list-inside text-sm text-gray-600">
                          {(machine.appointments ?? []).length > 0 ? (
                            machine.appointments.map(
                              (appointment: any, appointmentIndex: number) => (
                                <li key={appointmentIndex}>
                                  {appointment.date} at {appointment.time} -{" "}
                                  {appointment.customer_id}
                                </li>
                              )
                            )
                          ) : (
                            <li>No appointments</li>
                          )}
                        </ul>
                      </div>
                      <button
                        onClick={() => handleEdit(index)}
                        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(machine.machine_id)}
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
            <p className="text-gray-500 text-center">No available machines</p>
          )}
        </div>
      </div>
    </div>
  );
}
