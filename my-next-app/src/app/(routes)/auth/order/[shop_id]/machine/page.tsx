"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useAuth } from "@/app/context/AuthContext"; // Assuming you have an AuthContext to get user details

export default function MachinePage() {
  const params = useParams(); // Use useParams to access the params object
  const shop_id = params?.shop_id || ""; // Extract shop_id from params with a fallback
  const router = useRouter();
  const searchParams = useSearchParams();
  const [machines, setMachines] = useState<any[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const services = searchParams?.get("services")?.split(",") || []; // Get services from query params
  const { user } = useAuth();

  // Fetch machines for the shop
  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const response = await fetch(`/api/shops/${shop_id}/machines`);
        if (!response.ok) {
          console.log("Failed to fetch machines");
        }
        const data = await response.json();
        setMachines(data.machines);
      } catch (error) {
        console.error("Error fetching machines:", error);
      }
    };

    if (shop_id) {
      fetchMachines();
    }
  }, [shop_id]);

  // Update available times whenever the selected machine or date changes
  useEffect(() => {
    if (!selectedMachine || !selectedDate) {
      setAvailableTimes([]);
      return;
    }

    const selectedDayName = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
    }).format(selectedDate); // Get the day name for the selected date

    const availability = selectedMachine.availability.find(
      (slot: any) => slot.date === selectedDayName
    );

    if (availability) {
      const times = generateTimeSlots(availability.open, availability.close);
      setAvailableTimes(times);
    } else {
      setAvailableTimes([]);
    }
  }, [selectedMachine, selectedDate]);

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

  // Handle machine selection
  const handleMachineClick = (machine: any) => {
    setSelectedMachine(machine);
    setSelectedDate(null); // Reset selected date when a new machine is selected
    setSelectedTimes([]); // Reset selected times
  };

  // Handle time slot selection
  const handleTimeClick = (time: string) => {
    const machineMinMinutes = selectedMachine?.minimum_minutes || 0;
    const startTime = time;
    const endTime = new Date(`1970-01-01T${time}:00`);
    endTime.setMinutes(endTime.getMinutes() + machineMinMinutes);
    const formattedEndTime = endTime.toTimeString().slice(0, 5);

    console.log("Selected Machine:", selectedMachine);
    console.log("Start Time:", startTime);
    console.log("End Time:", formattedEndTime);
    console.log("Minimum Minutes:", machineMinMinutes);

    // Update selectedTimes with the start and end times
    setSelectedTimes([startTime, formattedEndTime]);
  };

  // Handle booking confirmation
  const handleBooking = async () => {
    if (!selectedDate) {
      alert("Please select a date first.");
      return;
    }

    if (selectedTimes.length === 0) {
      alert("Please select at least one time slot.");
      return;
    }

    const customer_id = user?.customer_id;
    if (!customer_id) {
      alert("Customer ID is missing. Please log in again.");
      return;
    }

    try {
      const timeRange = [
        {
          start: selectedTimes[0],
          end: selectedTimes[1],
        },
      ];

      console.log("Time Range to Save:", timeRange); // Debugging log

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shop_id: shop_id,
          machine_id: selectedMachine.machine_id,
          date: selectedDate.toISOString().split("T")[0],
          time_range: timeRange, // Pass the time range
          customer_id: customer_id,
          payment_method: "pay at the counter",
          order_type: "self-service",
          services: services,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save order");
      }

      const data = await response.json();
      console.log("Saved Time Range:", data.time_range);

      // Navigate to the confirmation page
      router.push(`/auth/order/confirmation?order_id=${data.order_id}`);
    } catch (error) {
      alert("Failed to save order. Please try again.");
    }
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
            <p>Machine Type: {machine.type}</p>
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

          <Calendar
            onChange={(value) => {
              if (value instanceof Date) {
                setSelectedDate(value);
              }
            }}
            value={selectedDate}
            tileDisabled={({ date }) => {
              // Disable dates before today
              const today = new Date();
              today.setHours(0, 0, 0, 0); // Set time to midnight for accurate comparison
              return date < today;
            }}
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
                    className={`p-2 border rounded ${
                      selectedTimes.includes(time)
                        ? "bg-blue-500 text-white"
                        : "bg-white hover:bg-blue-100"
                    }`}
                    onClick={() => handleTimeClick(time)} // Use the handleTimeClick function
                  >
                    {time}
                  </button>
                ))}
              </div>
              <button
                onClick={handleBooking}
                className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Confirm Booking
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
