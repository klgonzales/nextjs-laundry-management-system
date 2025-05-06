"use client";

import { useEffect, useState, useRef } from "react"; // Add useRef
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useAuth } from "@/app/context/AuthContext"; // Assuming you have an AuthContext to get user details
import { usePusher } from "@/app/context/PusherContext"; // Import Pusher context
import Home from "@/app/components/common/Home";
import {
  FiCalendar,
  FiClock,
  FiServer,
  FiCheck,
  FiSpeaker,
  FiCheckCircle,
} from "react-icons/fi";

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
  const [hasNewMachines, setHasNewMachines] = useState(false); // Add this state for highlighting
  const [shopName, setShopName] = useState<string>("");
  const [shopType, setShopType] = useState<string>("");
  const services = searchParams?.get("services")?.split(",") || []; // Get services from query params
  const { user } = useAuth();
  const { pusher, isConnected } = usePusher(); // Get Pusher from context
  const channelRef = useRef<any>(null); // For tracking subscriptions
  const [isProceedingToSchedule, setIsProceedingToSchedule] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch machines for the shop
  useEffect(() => {
    const fetchMachines = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/shops/${shop_id}/machines`);
        if (!response.ok) {
          throw new Error("Failed to fetch machines");
        }
        const data = await response.json();
        setMachines(data.machines);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching machines:", error);
        setLoading(false);
      }
    };

    if (shop_id) {
      fetchMachines();
    }

    // Store the fetchMachines function for reuse in Pusher handlers
    const refreshMachines = async () => {
      try {
        console.log("[Machine] Refreshing machines list");
        const response = await fetch(`/api/shops/${shop_id}/machines`);
        if (!response.ok) {
          throw new Error("Failed to refresh machines");
        }

        const data = await response.json();
        const newMachines = data.machines;

        // Check if there are new machines compared to current list
        if (newMachines.length > machines.length) {
          // Set highlight flag
          setHasNewMachines(true);

          // Clear highlight after 5 seconds
          setTimeout(() => {
            setHasNewMachines(false);
          }, 5000);
        }

        // Update machines state
        setMachines(newMachines);
      } catch (error) {
        console.error("[Machine] Error refreshing machines:", error);
      }
    };

    // Set up Pusher listeners when component mounts
    if (pusher && isConnected && user?.customer_id) {
      console.log("[Machine] Setting up Pusher subscriptions");

      // Clean up any existing subscriptions
      if (channelRef.current) {
        channelRef.current.unbind_all();
        if (pusher.channel(channelRef.current.name)) {
          pusher.unsubscribe(channelRef.current.name);
        }
      }

      // Subscribe to multiple channels for better reliability
      try {
        // 1. Private channel for this customer
        const privateChannelName = `private-client-${user.customer_id}`;
        const privateChannel = pusher.subscribe(privateChannelName);
        channelRef.current = privateChannel;

        // Log subscription status
        privateChannel.bind("pusher:subscription_succeeded", () => {
          console.log(
            `[Machine] Successfully subscribed to ${privateChannelName}`
          );
        });

        privateChannel.bind("pusher:subscription_error", (error: any) => {
          console.error(
            `[Machine] Failed to subscribe to ${privateChannelName}:`,
            error
          );

          // Fall back to public channel on auth error
          const publicChannelName = `customer-${user.customer_id}`;
          try {
            pusher.unsubscribe(privateChannelName);
            const publicChannel = pusher.subscribe(publicChannelName);
            channelRef.current = publicChannel;
            console.log(
              `[Machine] Fallback: Subscribed to ${publicChannelName}`
            );
          } catch (pubErr) {
            console.error("[Machine] Error in fallback subscription:", pubErr);
          }
        });

        // 2. Also subscribe to public test channel
        const testChannel = pusher.subscribe("test-machine-notifications");

        // Machine notification handlers
        const handleMachineAdded = (data: any) => {
          console.log("[Machine] Received machine notification:", data);

          // Only toast and refresh if notification is for current shop
          if (data.shop_id === shop_id) {
            // Refresh the machines list
            refreshMachines();
          } else {
            // Still show notification but different style
          }
        };

        // Bind same handler to multiple events/channels
        privateChannel.bind("new-machine-added", handleMachineAdded);
        testChannel.bind("new-machine-added", handleMachineAdded);

        // 3. Subscribe to global machines channel
        const globalChannel = pusher.subscribe("new-machines");
        globalChannel.bind("machine-added", (data: any) => {
          console.log("[Machine] Global machine update:", data);

          if (data.shop_id === shop_id) {
            // Refresh machines
            refreshMachines();
          }
        });
      } catch (error) {
        console.error("[Machine] Error setting up Pusher:", error);
      }
    }

    // Clean up function
    return () => {
      console.log("[Machine] Cleaning up Pusher subscriptions");

      // Clean up all subscriptions
      if (channelRef.current) {
        channelRef.current.unbind_all();
        pusher?.unsubscribe(channelRef.current.name);
      }

      // Also clean up other channels
      if (pusher) {
        pusher.unsubscribe("test-machine-notifications");
        pusher.unsubscribe("new-machines");
        pusher.unsubscribe(`customer-${user?.customer_id}`);
      }
    };
  }, [pusher, isConnected, user?.customer_id, shop_id]);

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

  function formatDateToYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0"); // getMonth() is 0-indexed
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

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

    setIsProceedingToSchedule(true); // Set loading state to true

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
          date: formatDateToYYYYMMDD(selectedDate),
          time_range: timeRange, // Pass the time range
          customer_id: customer_id,
          payment_method: "pay at the counter",
          order_type: "self-service",
          services: services,
          total_weight: selectedMachine.minimum_kg,
          total_price: selectedMachine.price_per_minimum_kg,
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

  // Check if we can proceed to booking
  const canProceed =
    selectedMachine && selectedDate && selectedTimes.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 w-full">
      {/* Header */}
      <div className="bg-white shadow-sm w-full px-0 mx-0">
        <Home href={`/auth/order/${shop_id}/services`} />
      </div>

      {/* Order Progress Bar */}
      <div className="bg-white pt-6 pb-4 px-4 shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
            Select a Machine
          </h2>

          {/* Progress steps with properly positioned connecting line */}
          <div className="relative">
            {/* Connecting line - positioned in the middle of the circles */}
            <div className="absolute top-4 left-0 right-0 flex items-center">
              <div className="h-0.5 bg-gray-200 w-full" />
              <div
                className="absolute h-0.5 bg-[#F468BB] transition-all duration-300"
                style={{ width: "50%" }}
              />
            </div>

            {/* Steps display */}
            <div className="relative flex items-center justify-between mb-2">
              {/* Step 1: Choose Shop - completed */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#F468BB] text-white">
                  <FiCheckCircle />
                </div>
                <span className="text-xs mt-2 text-[#F468BB] font-medium">
                  Select Shop
                </span>
              </div>

              {/* Step 2: Choose Services - completed */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#F468BB] text-white">
                  <span>
                    {" "}
                    <FiCheckCircle />
                  </span>
                </div>
                <span className="text-xs mt-2 text-[#F468BB] font-medium">
                  Select Services
                </span>
              </div>

              {/* Step 3: Machine - active */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#F468BB] text-white">
                  <span>3</span>
                </div>
                <span className="text-xs mt-2 text-[#F468BB] font-medium">
                  Select Machine
                </span>
              </div>

              {/* Step 4: Schedule - pending */}
              {/* <div className="flex flex-col items-center relative z-10">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-gray-200 text-gray-400">
                  <span>4</span>
                </div>
                <span className="text-xs mt-2 text-gray-500">Payment</span>
              </div> */}

              {/* Step 5: Review - pending */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-gray-200 text-gray-400">
                  <span>5</span>
                </div>
                <span className="text-xs mt-2 text-gray-500">
                  Order Summary
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full py-8 px-4 max-w-5xl mx-auto">
        {loading ? (
          // Skeletal Loading UI
          <div className="bg-white shadow rounded-lg overflow-hidden animate-pulse">
            {/* Shop Info Summary Skeleton */}
            <div className="p-4 bg-purple-50 border-b border-gray-200">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-purple-100">
                  <div className="h-5 w-5 bg-purple-200 rounded"></div>
                </div>
                <div className="ml-3">
                  <div className="h-5 w-40 bg-gray-200 rounded mb-1"></div>
                  <div className="h-4 w-32 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>

            {/* Services Selected Skeleton */}
            <div className="p-4 bg-blue-50 border-b border-gray-200">
              <div className="h-5 w-36 bg-gray-200 rounded mb-2"></div>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-6 w-20 bg-gray-200 rounded-full"
                  ></div>
                ))}
              </div>
            </div>
            {/* Machine Selection Skeleton */}
            <div className="p-6">
              <div className="mb-6">
                <div className="h-6 w-40 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 w-64 bg-gray-200 rounded"></div>
              </div>

              {/* Machines Grid Skeleton */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-row gap-2 items-center mt-2">
                          <div className="h-5 w-24 bg-gray-200 rounded"></div>
                          <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
                        </div>
                        <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between mb-1">
                          <div className="h-4 w-24 bg-gray-200 rounded"></div>
                          <div className="h-4 w-10 bg-gray-200 rounded"></div>
                        </div>
                        <div className="flex justify-between mb-1">
                          <div className="h-4 w-16 bg-gray-200 rounded"></div>
                          <div className="h-4 w-14 bg-gray-200 rounded"></div>
                        </div>
                        <div className="flex justify-between">
                          <div className="h-4 w-12 bg-gray-200 rounded"></div>
                          <div className="h-4 w-12 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Calendar Area Skeleton */}
              <div className="mt-8 border-t border-gray-200 pt-6">
                <div className="h-6 w-48 bg-gray-200 rounded mb-4"></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Calendar Skeleton */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="h-5 w-24 bg-gray-200 rounded mb-3"></div>
                    <div className="h-64 w-full bg-gray-100 rounded"></div>
                  </div>

                  {/* Time Slots Skeleton */}
                  <div>
                    <div className="h-5 w-48 bg-gray-200 rounded mb-3"></div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="h-10 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Buttons Skeleton */}
              <div className="mt-8 flex space-x-4 justify-end">
                <div className="h-10 w-20 bg-gray-200 rounded"></div>
                <div className="h-10 w-36 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {/* Shop Info Summary */}
            <div className="p-4 bg-purple-50 border-b border-gray-200">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-purple-100">
                  <FiSpeaker className="h-5 w-5 text-purple-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    {shopName}
                  </h3>
                  <p className="text-sm text-gray-600">Self-Service Laundry</p>
                </div>
              </div>
            </div>

            {/* Services Selected */}
            <div className="p-4 bg-blue-50 border-b border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">
                Selected Services
              </h3>
              <div className="flex flex-wrap gap-2">
                {services.map((service, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[#F468BB] bg-opacity-20 text-white"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>

            {/* Machine Selection */}
            <div className="p-6">
              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Available Machines
                </h4>
                <p className="text-sm text-gray-600">
                  Select a machine to use for your laundry.
                  {hasNewMachines && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full animate-pulse">
                      New machines added!
                    </span>
                  )}
                </p>
              </div>

              {/* Machines Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {machines.length > 0 ? (
                  machines.map((machine) => (
                    <div
                      key={machine.machine_id}
                      className={`border rounded-lg overflow-hidden transition-all hover:shadow-md cursor-pointer ${
                        selectedMachine?.machine_id === machine.machine_id
                          ? "border-[#F468BB] bg-pink-50"
                          : machine.customer_id
                            ? "border-gray-200 bg-gray-100 opacity-70"
                            : "border-gray-200 bg-white"
                      }`}
                      onClick={() => {
                        if (!machine.customer_id) {
                          handleMachineClick(machine);
                        }
                      }}
                    >
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-row gap-2 items-center mt-2">
                            <span>
                              <h5 className="font-medium text-gray-900">
                                {machine.machine_id}
                              </h5>
                            </span>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                machine.type === "Washing"
                                  ? "bg-blue-100 text-blue-500"
                                  : "bg-blue-100 text-blue-500"
                              }`}
                            >
                              {machine.type.charAt(0).toUpperCase() +
                                machine.type.slice(1)}
                            </span>
                          </div>
                          {selectedMachine?.machine_id ===
                            machine.machine_id && (
                            <div className="bg-[#F468BB] rounded-full p-1">
                              <FiCheck className="text-white" />
                            </div>
                          )}
                          {machine.customer_id && (
                            <div className="bg-gray-500 text-white text-xs px-2 py-1 rounded">
                              In Use
                            </div>
                          )}
                        </div>
                        <div className="mt-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Minimum Load:</span>
                            <span className="font-medium text-gray-800">
                              {machine.minimum_kg} kg
                            </span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-gray-600">Duration:</span>
                            <span className="font-medium text-gray-800">
                              {machine.minimum_minutes} min
                            </span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-gray-600">Price:</span>
                            <span className="font-medium text-[#F468BB]">
                              ₱{machine.price_per_minimum_kg}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 py-6 text-center">
                    <p className="text-gray-500">
                      No machines available right now.
                    </p>
                  </div>
                )}
              </div>

              {/* Schedule Section */}
              {selectedMachine && (
                <div className="mt-8 border-t border-gray-200 pt-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <FiCalendar className="mr-2" /> Schedule for{" "}
                    <span className="ml-1 text-[#F468BB]">
                      {selectedMachine.machine_id}
                    </span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h5 className="font-medium text-gray-700 mb-3">
                        Select Date
                      </h5>
                      <div className="calendar-container">
                        <Calendar
                          onChange={(value) => {
                            if (value instanceof Date) {
                              setSelectedDate(value);
                            }
                          }}
                          value={selectedDate}
                          tileDisabled={({ date }) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                          className="w-full rounded-lg shadow-sm"
                        />
                      </div>
                    </div>

                    <div>
                      {selectedDate ? (
                        <div>
                          <h5 className="font-medium text-gray-700 mb-3 flex items-center">
                            <FiClock className="mr-2" /> Available Times for{" "}
                            {selectedDate.toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                            })}
                          </h5>

                          {availableTimes.length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                              {availableTimes.map((time) => (
                                <button
                                  key={time}
                                  className={`p-2 text-sm border rounded-md transition-all ${
                                    selectedTimes[0] === time
                                      ? "bg-[#F468BB] text-white border-[#F468BB]"
                                      : "bg-white hover:bg-pink-50 border-gray-200"
                                  }`}
                                  onClick={() => handleTimeClick(time)}
                                >
                                  {time}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-gray-50 p-4 rounded-lg text-center">
                              <p className="text-gray-500">
                                No available time slots for this date.
                              </p>
                            </div>
                          )}

                          {selectedTimes.length > 0 && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                              <h6 className="font-medium text-gray-800 mb-1">
                                Selected Time Slot:
                              </h6>
                              <div className="flex items-center text-blue-700">
                                <span className="font-medium">
                                  {selectedTimes[0]}
                                </span>
                                <span className="mx-2">to</span>
                                <span className="font-medium">
                                  {selectedTimes[1]}
                                </span>
                                <span className="ml-2 text-sm text-gray-600">
                                  ({selectedMachine.minimum_minutes} min)
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg p-8">
                          <p className="text-gray-500 text-center">
                            Please select a date to view available time slots.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="mt-8 flex space-x-4 justify-end">
                <button
                  onClick={() => router.back()}
                  className="btn btn-neutral w-45"
                >
                  Back
                </button>
                <button
                  onClick={handleBooking}
                  disabled={!canProceed}
                  className={`px-6 py-2.5 bg-[#F468BB] text-white rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center ${
                    !canProceed || isProceedingToSchedule
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  {isProceedingToSchedule ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Loading...
                    </>
                  ) : (
                    "Complete Order"
                  )}
                </button>
              </div>

              {/* Help Text */}
              {!canProceed && selectedMachine && (
                <p className="text-center text-sm text-gray-500 mt-4">
                  {!selectedDate
                    ? "Please select a date to continue."
                    : selectedTimes.length === 0
                      ? "Please select a time slot to continue."
                      : ""}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Custom Calendar Styles */}
      <style jsx global>{`
        .react-calendar {
          width: 100%;
          border: none;
          font-family: inherit;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .react-calendar__tile--active {
          background: #f468bb;
          color: white;
        }
        .react-calendar__tile--active:enabled:hover,
        .react-calendar__tile--active:enabled:focus {
          background: #d44f9e;
        }
        .react-calendar__tile:enabled:hover,
        .react-calendar__tile:enabled:focus {
          background-color: #fce7f3;
        }
        .react-calendar__navigation button:enabled:hover,
        .react-calendar__navigation button:enabled:focus {
          background-color: #fce7f3;
        }
      `}</style>
    </div>
  );
}
