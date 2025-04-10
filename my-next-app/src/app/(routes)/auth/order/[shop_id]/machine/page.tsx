"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export default function MachinePage({
  params,
}: {
  params: { shop_id: string };
}) {
  const { shop_id } = params;
  const router = useRouter();
  const [machines, setMachines] = useState<any[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  // Fetch machines for the shop
  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const response = await fetch(`/api/shops/${shop_id}/machines`);
        if (!response.ok) {
          throw new Error("Failed to fetch machines");
        }
        const data = await response.json();
        setMachines(data.machines);
      } catch (error) {
        console.error("Error fetching machines:", error);
      }
    };

    fetchMachines();
  }, [shop_id]);

  // Handle machine selection
  const handleMachineClick = (machine: any) => {
    setSelectedMachine(machine);

    // Extract available times for the selected machine
    const today = new Date().toISOString().split("T")[0]; // Get today's date
    const availability = machine.availability.find(
      (slot: any) => slot.date === today
    );

    if (availability) {
      const times = generateTimeSlots(availability.open, availability.close);
      setAvailableTimes(times);
    } else {
      setAvailableTimes([]);
    }
  };

  // Generate time slots between open and close times
  const generateTimeSlots = (open: string, close: string) => {
    const slots: string[] = [];
    let currentTime = new Date(`1970-01-01T${open}:00`);
    const endTime = new Date(`1970-01-01T${close}:00`);

    while (currentTime < endTime) {
      slots.push(currentTime.toTimeString().slice(0, 5)); // Format HH:mm
      currentTime.setMinutes(currentTime.getMinutes() + 30); // Increment by 30 minutes
    }

    return slots;
  };

  // Handle booking confirmation
  const handleBooking = (time: string) => {
    if (!selectedDate) {
      alert("Please select a date first.");
      return;
    }

    const bookingDetails = {
      shop_id,
      machine_id: selectedMachine.machine_id,
      date: selectedDate.toISOString().split("T")[0],
      time,
    };

    // Redirect to order confirmation page with booking details
    router.push(
      `/auth/order/confirmation?details=${encodeURIComponent(JSON.stringify(bookingDetails))}`
    );
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Available Machines</h1>

      {/* Machine List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {machines.map((machine) => (
          <div
            key={machine.machine_id}
            className="p-4 border rounded shadow cursor-pointer hover:bg-gray-100"
            onClick={() => handleMachineClick(machine)}
          >
            <h2 className="text-lg font-semibold">{machine.machine_id}</h2>
            <p>Minimum KG: {machine.minimum_kg}</p>
            <p>Price per Minimum KG: ₱{machine.price_per_minimum_kg}</p>
          </div>
        ))}
      </div>

      {/* Calendar and Time Slots */}
      {selectedMachine && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">
            Booking for Machine: {selectedMachine.machine_id}
          </h2>

          {/* Calendar */}
          <Calendar
            onChange={(value) => {
              if (value instanceof Date) {
                setSelectedDate(value);
              } else if (
                Array.isArray(value) &&
                value.length > 0 &&
                value[0] instanceof Date
              ) {
                setSelectedDate(value[0]);
              } else {
                setSelectedDate(null);
              }
            }}
            value={selectedDate}
          />

          {/* Time Slots */}
          {selectedDate && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">
                Available Times for {selectedDate.toDateString()}:
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {availableTimes.map((time) => (
                  <button
                    key={time}
                    className="p-2 border rounded bg-white hover:bg-blue-100"
                    onClick={() => handleBooking(time)}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
