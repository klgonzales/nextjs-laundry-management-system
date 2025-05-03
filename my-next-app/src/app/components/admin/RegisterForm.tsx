"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiUser,
  FiMail,
  FiLock,
  FiHome,
  FiPhone,
  FiCalendar,
  FiClock,
  FiPlus,
  FiTrash2,
  FiBox,
  FiCreditCard,
  FiDollarSign,
  FiCheckCircle,
} from "react-icons/fi";

export default function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  interface Machine {
    machine_id: string;
    minimum_kg: number;
    minimum_minutes: number;
    availability: {
      date: string; // Date when the machine is available
      open: string; // Time when the machine is available
      close: string; // Time when the machine is available
    }[]; // Array of availability slots
    price_per_minimum_kg: number;
    customer_id?: string | null;
    appointments?: {
      date: string;
      time: string;
      customer_id: string;
    }[];
    type: string;
  }

  interface FormData {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    shop_id: string;
    shop_name: string;
    shop_address: string;
    shop_phone: string;
    shop_email: string;
    shop_type: string;
    services: {
      service_id: number;
      name: string;
      price_per_kg: number;
      description: string;
    }[];
    customService?: string;
    payment_methods: {
      method_id: number;
      name: string;
      account_number: string;
    }[];
    opening_hours: {
      [day: string]: { start: string; end: string };
    };
    delivery_fee?: boolean;
    role: string;
    machines?: Machine[]; // Optional field for machines
  }

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    shop_id: Date.now().toString(), // Ensure shop_id is a string
    shop_name: "",
    shop_address: "",
    shop_phone: "",
    shop_email: "",
    shop_type: "self-service",
    services: [],
    machines: [], // Initialize machines as an empty array
    payment_methods: [],
    //payment_accounts: {},
    opening_hours: {
      Monday: { start: "09:00", end: "17:00" },
      Tuesday: { start: "09:00", end: "17:00" },
      Wednesday: { start: "09:00", end: "17:00" },
      Thursday: { start: "09:00", end: "17:00" },
      Friday: { start: "09:00", end: "17:00" },
      Saturday: { start: "09:00", end: "17:00" },
      Sunday: { start: "09:00", end: "17:00" },
    },
    delivery_fee: false, // Default value for boolean, can be overridden if admin answers yes
    role: "admin", // Default role for the admin
  });
  const [error, setError] = useState("");
  const [newMachine, setNewMachine] = useState<Machine>({
    machine_id: "",
    minimum_kg: 0,
    minimum_minutes: 0,
    availability: [],
    price_per_minimum_kg: 0,
    customer_id: null,
    appointments: [],
    type: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const handleAddMachine = () => {
    if (
      !newMachine.machine_id ||
      !newMachine.type ||
      !newMachine.minimum_kg ||
      !newMachine.minimum_minutes ||
      !newMachine.availability ||
      !newMachine.price_per_minimum_kg
    ) {
      setError("Please fill out all machine fields.");
      return;
    }

    setFormData({
      ...formData,
      machines: [...(formData.machines || []), newMachine],
    });

    // Reset the new machine form
    setNewMachine({
      machine_id: "",
      minimum_kg: 0,
      minimum_minutes: 0,
      availability: [],
      price_per_minimum_kg: 0,
      customer_id: null,
      appointments: [],
      type: "",
    });

    setError("");
  };

  const validatePassword = (password: string) => {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number");
    }
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push(
        "Password must contain at least one special character (!@#$%^&*)"
      );
    }
    return errors;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setFormData({ ...formData, password: newPassword });
    setPasswordErrors(validatePassword(newPassword));
  };

  const handleNext = () => {
    if (step === 1) {
      // Validate passwords
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      const errors = validatePassword(formData.password);
      if (errors.length > 0) {
        setPasswordErrors(errors);
        return;
      }
    }
    // Skip machines step (4) if shop type is pickup-delivery
    if (step === 3 && formData.shop_type === "pickup-delivery") {
      setStep(5); // Skip to payment methods
    } else {
      setStep(step + 1);
    }

    setError("");
  };

  const handlePrevious = () => {
    // If we're at payment methods (step 5) and shop_type is pickup-delivery,
    // go back to services (step 3)
    if (step === 5 && formData.shop_type === "pickup-delivery") {
      setStep(3);
    } else {
      setStep(step - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const { confirmPassword, ...submitData } = formData; // Remove confirmPassword from submission
      const res = await fetch("/api/admin/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      router.push("/admin/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  //   return (
  //     <div className="h-auto flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
  //       <div className="max-w-md w-full space-y-8 h-auto">
  //         <div>
  //           <h2 className="mt-6 text-center text-3xl font-regular text-gray-900">
  //             {step === 1 && "Create Your Account"}
  //             {step === 2 && "Shop Details"}
  //             {step === 3 && "Services Offered"}
  //             {step === 4 && "Add Machines"}
  //             {step === 5 && "Payment Methods"}
  //           </h2>
  //         </div>
  //         <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
  //           {error && (
  //             <div className="text-red-500 text-center text-sm">{error}</div>
  //           )}
  //           {step === 1 && (
  //             <div className="rounded-md shadow-sm space-y-2">
  //               <div>
  //                 <input
  //                   type="text"
  //                   required
  //                   className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
  //                   placeholder="Name"
  //                   value={formData.name}
  //                   onChange={(e) =>
  //                     setFormData({ ...formData, name: e.target.value })
  //                   }
  //                 />
  //               </div>
  //               <div>
  //                 <input
  //                   type="email"
  //                   required
  //                   className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
  //                   placeholder="Email address"
  //                   value={formData.email}
  //                   onChange={(e) =>
  //                     setFormData({ ...formData, email: e.target.value })
  //                   }
  //                 />
  //               </div>
  //               <div>
  //                 <input
  //                   type="password"
  //                   required
  //                   className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
  //                   placeholder="Password"
  //                   value={formData.password}
  //                   onChange={handlePasswordChange}
  //                 />
  //                 {passwordErrors.length > 0 && (
  //                   <ul className="mt-1 text-xs text-red-500 list-disc list-inside">
  //                     {passwordErrors.map((error, index) => (
  //                       <li key={index}>{error}</li>
  //                     ))}
  //                   </ul>
  //                 )}
  //               </div>
  //               <div>
  //                 <input
  //                   type="password"
  //                   required
  //                   className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
  //                   placeholder="Confirm Password"
  //                   value={formData.confirmPassword}
  //                   onChange={(e) =>
  //                     setFormData({
  //                       ...formData,
  //                       confirmPassword: e.target.value,
  //                     })
  //                   }
  //                 />
  //               </div>
  //             </div>
  //           )}
  //           {step === 2 && (
  //             <div className="rounded-md shadow-sm space-y-2">
  //               <div>
  //                 <input
  //                   type="text"
  //                   required
  //                   className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
  //                   placeholder="Shop Name"
  //                   value={formData.shop_name}
  //                   onChange={(e) =>
  //                     setFormData({ ...formData, shop_name: e.target.value })
  //                   }
  //                 />
  //               </div>
  //               <div>
  //                 <input
  //                   type="text"
  //                   required
  //                   className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
  //                   placeholder="Shop Address"
  //                   value={formData.shop_address}
  //                   onChange={(e) =>
  //                     setFormData({ ...formData, shop_address: e.target.value })
  //                   }
  //                 />
  //               </div>
  //               <div>
  //                 <input
  //                   type="tel"
  //                   required
  //                   className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
  //                   placeholder="Contact Number"
  //                   value={formData.shop_phone}
  //                   onChange={(e) =>
  //                     setFormData({ ...formData, shop_phone: e.target.value })
  //                   }
  //                 />
  //               </div>
  //               <div>
  //                 <input
  //                   type="email"
  //                   required
  //                   className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
  //                   placeholder="Shop Email"
  //                   value={formData.shop_email}
  //                   onChange={(e) =>
  //                     setFormData({ ...formData, shop_email: e.target.value })
  //                   }
  //                 />
  //               </div>
  //               <div>
  //                 <select
  //                   required
  //                   className="appearance-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
  //                   value={formData.shop_type}
  //                   onChange={(e) =>
  //                     setFormData({ ...formData, shop_type: e.target.value })
  //                   }
  //                 >
  //                   <option value="self-service">Self-Service</option>
  //                   <option value="pickup-delivery">Pickup & Delivery</option>
  //                 </select>
  //               </div>
  //               <div>
  //                 <label className="block text-sm font-medium text-gray-700">
  //                   Free Delivery
  //                 </label>
  //                 <div className="flex items-center space-x-4">
  //                   <div className="flex items-center">
  //                     <input
  //                       type="radio"
  //                       id="freeDeliveryYes"
  //                       name="freeDelivery"
  //                       value="yes"
  //                       checked={formData.delivery_fee === true}
  //                       onChange={() =>
  //                         setFormData({ ...formData, delivery_fee: true })
  //                       }
  //                       className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
  //                     />
  //                     <label
  //                       htmlFor="freeDeliveryYes"
  //                       className="ml-2 block text-sm text-gray-700"
  //                     >
  //                       Yes
  //                     </label>
  //                   </div>
  //                   <div className="flex items-center">
  //                     <input
  //                       type="radio"
  //                       id="freeDeliveryNo"
  //                       name="freeDelivery"
  //                       value="no"
  //                       checked={formData.delivery_fee === false}
  //                       onChange={() =>
  //                         setFormData({ ...formData, delivery_fee: false })
  //                       }
  //                       className="h-4 w-4 text-blue-600 focus:ring-blue-500"
  //                     />
  //                     <label
  //                       htmlFor="freeDeliveryNo"
  //                       className="ml-2 block text-sm text-gray-700"
  //                     >
  //                       No
  //                     </label>
  //                   </div>
  //                 </div>
  //               </div>
  //               <div>
  //                 <div>
  //                   <label className="block text-sm font-medium text-gray-700">
  //                     Opening Hours and Days
  //                   </label>
  //                   <div className="space-y-4">
  //                     {[
  //                       "Monday",
  //                       "Tuesday",
  //                       "Wednesday",
  //                       "Thursday",
  //                       "Friday",
  //                       "Saturday",
  //                       "Sunday",
  //                     ].map((day) => (
  //                       <div key={day} className="space-y-2">
  //                         {/* Checkbox to Enable/Disable Day */}
  //                         <div className="flex items-center space-x-2">
  //                           <input
  //                             type="checkbox"
  //                             id={day}
  //                             value={day}
  //                             checked={formData.opening_hours[day] !== undefined} // Check if the day exists in the object
  //                             onChange={(e) => {
  //                               const updatedHours = {
  //                                 ...formData.opening_hours,
  //                               };
  //                               if (e.target.checked) {
  //                                 updatedHours[day] = {
  //                                   start: "09:00",
  //                                   end: "17:00",
  //                                 }; // Add default hours
  //                               } else {
  //                                 delete updatedHours[day]; // Remove the day if unchecked
  //                               }
  //                               setFormData({
  //                                 ...formData,
  //                                 opening_hours: updatedHours,
  //                               });
  //                             }}
  //                             className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
  //                           />
  //                           <label
  //                             htmlFor={day}
  //                             className="block text-sm text-gray-700"
  //                           >
  //                             {day}
  //                           </label>
  //                         </div>

  //                         {/* Time Inputs for Start and End Times */}
  //                         {formData.opening_hours[day] && (
  //                           <div className="flex space-x-2">
  //                             <input
  //                               type="time"
  //                               value={formData.opening_hours[day].start} // Access the start time
  //                               onChange={(e) => {
  //                                 const updatedHours = {
  //                                   ...formData.opening_hours,
  //                                   [day]: {
  //                                     ...formData.opening_hours[day],
  //                                     start: e.target.value,
  //                                   }, // Update start time
  //                                 };
  //                                 setFormData({
  //                                   ...formData,
  //                                   opening_hours: updatedHours,
  //                                 });
  //                               }}
  //                               className="appearance-none relative block w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
  //                             />
  //                             <span className="text-gray-700">to</span>
  //                             <input
  //                               type="time"
  //                               value={formData.opening_hours[day].end} // Access the end time
  //                               onChange={(e) => {
  //                                 const updatedHours = {
  //                                   ...formData.opening_hours,
  //                                   [day]: {
  //                                     ...formData.opening_hours[day],
  //                                     end: e.target.value,
  //                                   }, // Update end time
  //                                 };
  //                                 setFormData({
  //                                   ...formData,
  //                                   opening_hours: updatedHours,
  //                                 });
  //                               }}
  //                               className="appearance-none relative block w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
  //                             />
  //                           </div>
  //                         )}
  //                       </div>
  //                     ))}
  //                   </div>
  //                 </div>
  //               </div>
  //             </div>
  //           )}
  //           {step === 3 && (
  //             <div className="rounded-md shadow-sm space-y-4">
  //               <label className="block text-sm font-medium text-gray-700">
  //                 Services Offered
  //               </label>

  //               {/* Predefined Services */}
  //               <div className="space-y-2">
  //                 {["Wash", "Iron", "Fold", "Dry Cleaning", "Shoe Cleaning"].map(
  //                   (serviceName) => (
  //                     <div key={serviceName} className="flex items-center">
  //                       <input
  //                         type="checkbox"
  //                         id={serviceName}
  //                         value={serviceName}
  //                         checked={formData.services.some(
  //                           (service) => service.name === serviceName
  //                         )}
  //                         onChange={(e) => {
  //                           const newServices = [...formData.services];
  //                           if (e.target.checked) {
  //                             // Add the service if checked
  //                             newServices.push({
  //                               service_id: Date.now(),
  //                               name: serviceName,
  //                               price_per_kg: 0,
  //                               description: "",
  //                             });
  //                           } else {
  //                             // Remove the service if unchecked
  //                             const index = newServices.findIndex(
  //                               (service) => service.name === serviceName
  //                             );
  //                             newServices.splice(index, 1);
  //                           }
  //                           setFormData({ ...formData, services: newServices });
  //                         }}
  //                         className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
  //                       />
  //                       <label
  //                         htmlFor={serviceName}
  //                         className="ml-2 block text-sm text-gray-700"
  //                       >
  //                         {serviceName}
  //                       </label>
  //                     </div>
  //                   )
  //                 )}
  //               </div>

  //               {/* Custom Service Input */}
  //               <div className="space-y-2">
  //                 <label className="block text-sm font-medium text-gray-700">
  //                   Add Custom Service
  //                 </label>
  //                 <div className="flex space-x-2">
  //                   <input
  //                     type="text"
  //                     placeholder="Custom Service Name"
  //                     className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
  //                     value={formData.customService || ""}
  //                     onChange={(e) =>
  //                       setFormData({
  //                         ...formData,
  //                         customService: e.target.value,
  //                       })
  //                     }
  //                   />
  //                   <button
  //                     type="button"
  //                     className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
  //                     onClick={() => {
  //                       if (formData.customService?.trim()) {
  //                         const newServices = [
  //                           ...formData.services,
  //                           {
  //                             service_id: Date.now(),
  //                             name: formData.customService.trim(),
  //                             price_per_kg: 0,
  //                             description: "",
  //                           },
  //                         ];
  //                         setFormData({
  //                           ...formData,
  //                           services: newServices,
  //                           customService: "", // Clear the input field
  //                         });
  //                       }
  //                     }}
  //                   >
  //                     Add
  //                   </button>
  //                 </div>
  //               </div>

  //               {/* Display Selected Services */}
  //               <div className="mt-4">
  //                 <h4 className="text-md font-semibold text-gray-800">
  //                   Selected Services:
  //                 </h4>
  //                 <ul className="list-disc list-inside text-sm text-gray-600">
  //                   {formData.services.map((service, index) => (
  //                     <li
  //                       key={index}
  //                       className="flex justify-between items-center"
  //                     >
  //                       <span>{service.name}</span>
  //                       <button
  //                         type="button"
  //                         className="text-red-500 text-sm hover:underline"
  //                         onClick={() => {
  //                           const newServices = [...formData.services];
  //                           newServices.splice(index, 1);
  //                           setFormData({ ...formData, services: newServices });
  //                         }}
  //                       >
  //                         Remove
  //                       </button>
  //                     </li>
  //                   ))}
  //                 </ul>
  //               </div>
  //             </div>
  //           )}

  //           {step === 4 && formData.shop_type !== "pickup-delivery" && (
  //             <div className="rounded-md shadow-sm space-y-4">
  //               <h3 className="text-lg font-medium text-gray-900">
  //                 Add Available Machines
  //               </h3>
  //               <div className="space-y-2">
  //                 {/* Machine ID Input */}
  //                 <input
  //                   type="text"
  //                   placeholder="Machine ID"
  //                   value={newMachine.machine_id}
  //                   onChange={(e) =>
  //                     setNewMachine({ ...newMachine, machine_id: e.target.value })
  //                   }
  //                   className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
  //                 />

  //                 {/* Machine Type Input */}
  //                 <input
  //                   type="text"
  //                   placeholder="Machine Type"
  //                   value={newMachine.type}
  //                   onChange={(e) =>
  //                     setNewMachine({ ...newMachine, type: e.target.value })
  //                   }
  //                   className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
  //                 />

  //                 {/* Minimum KG Input */}
  //                 <input
  //                   type="number"
  //                   placeholder="Minimum KG"
  //                   value={newMachine.minimum_kg}
  //                   onChange={(e) =>
  //                     setNewMachine({
  //                       ...newMachine,
  //                       minimum_kg: parseInt(e.target.value, 10),
  //                     })
  //                   }
  //                   className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
  //                 />

  //                 <input
  //                   type="number"
  //                   placeholder="Minimum minutes"
  //                   value={newMachine.minimum_minutes}
  //                   onChange={(e) =>
  //                     setNewMachine({
  //                       ...newMachine,
  //                       minimum_minutes: parseInt(e.target.value, 10),
  //                     })
  //                   }
  //                   className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
  //                 />

  //                 {/* Price per Minimum KG Input */}
  //                 <input
  //                   type="number"
  //                   placeholder="Price per Minimum KG"
  //                   value={newMachine.price_per_minimum_kg}
  //                   onChange={(e) =>
  //                     setNewMachine({
  //                       ...newMachine,
  //                       price_per_minimum_kg: parseFloat(e.target.value),
  //                     })
  //                   }
  //                   className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
  //                 />

  //                 {/* Add Machine Button */}
  //                 <button
  //                   type="button"
  //                   onClick={() => {
  //                     if (
  //                       !newMachine.machine_id ||
  //                       !newMachine.minimum_kg ||
  //                       !newMachine.type ||
  //                       !newMachine.minimum_minutes ||
  //                       !newMachine.price_per_minimum_kg
  //                     ) {
  //                       setError("Please fill out all machine fields.");
  //                       return;
  //                     }

  //                     // Automatically set machine availability to match shop opening hours
  //                     const machineAvailability = Object.entries(
  //                       formData.opening_hours
  //                     ).map(([day, hours]) => ({
  //                       date: day,
  //                       open: hours.start,
  //                       close: hours.end,
  //                     }));

  //                     const machineToAdd = {
  //                       ...newMachine,
  //                       availability: machineAvailability, // Set availability based on shop opening hours
  //                     };

  //                     setFormData({
  //                       ...formData,
  //                       machines: [...(formData.machines || []), machineToAdd],
  //                     });

  //                     // Reset the new machine form
  //                     setNewMachine({
  //                       machine_id: "",
  //                       minimum_kg: 0,
  //                       minimum_minutes: 0,
  //                       availability: [],
  //                       price_per_minimum_kg: 0,
  //                       customer_id: null,
  //                       appointments: [],
  //                       type: "",
  //                     });

  //                     setError("");
  //                   }}
  //                   className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
  //                 >
  //                   Add Machine
  //                 </button>
  //               </div>

  //               {/* Display Added Machines */}
  //               <div className="mt-4">
  //                 <h4 className="text-md font-semibold text-gray-800">
  //                   Added Machines:
  //                 </h4>
  //                 <ul className="list-disc list-inside text-sm text-gray-600">
  //                   {(formData.machines || []).map((machine, index) => (
  //                     <li key={index}>
  //                       {machine.machine_id} ({machine.type}) -{" "}
  //                       {machine.minimum_kg}kg - {machine.minimum_minutes} minutes
  //                       - ₱{machine.price_per_minimum_kg}
  //                       <ul className="list-disc list-inside ml-4">
  //                         {machine.availability.map((slot, idx) => (
  //                           <li key={idx}>
  //                             {slot.date}: {slot.open} - {slot.close}
  //                           </li>
  //                         ))}
  //                       </ul>
  //                     </li>
  //                   ))}
  //                 </ul>
  //               </div>
  //             </div>
  //           )}

  //           {step === 5 && (
  //             <div className="rounded-md space-y-2">
  //               <label className="block text-sm font-medium text-gray-700">
  //                 Payment Methods
  //               </label>
  //               <div className="space-y-2">
  //                 {["cash", "credit-card", "gcash", "bank-transfer"].map(
  //                   (method) => (
  //                     <div key={method} className="flex items-center">
  //                       <input
  //                         type="checkbox"
  //                         id={method}
  //                         value={method}
  //                         checked={formData.payment_methods.includes(method)}
  //                         onChange={(e) => {
  //                           const selectedMethods =
  //                             formData.payment_methods.includes(method)
  //                               ? formData.payment_methods.filter(
  //                                   (m) => m !== method
  //                                 )
  //                               : [...formData.payment_methods, method];
  //                           setFormData({
  //                             ...formData,
  //                             payment_methods: selectedMethods,
  //                           });
  //                         }}
  //                         className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
  //                       />
  //                       <label
  //                         htmlFor={method}
  //                         className="ml-2 block text-sm text-gray-700"
  //                       >
  //                         {method
  //                           .replace("-", " ")
  //                           .replace(/\b\w/g, (char) => char.toUpperCase())}
  //                       </label>
  //                     </div>
  //                   )
  //                 )}
  //               </div>
  //             </div>
  //           )}
  //           <div className="flex justify-between">
  //             {step > 1 && (
  //               <button
  //                 type="button"
  //                 className="w-full btn btn-neutral"
  //                 onClick={handlePrevious}
  //               >
  //                 Previous
  //               </button>
  //             )}
  //             {step < 5 && (
  //               <button
  //                 type="button"
  //                 className="w-full btn btn-primary"
  //                 onClick={handleNext}
  //               >
  //                 Next
  //               </button>
  //             )}
  //             {step === 5 && (
  //               <button type="submit" className="w-full btn btn-primary">
  //                 Submit
  //               </button>
  //             )}
  //           </div>
  //         </form>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mt-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    s <= step
                      ? "bg-[#F468BB] text-white"
                      : "bg-[#F9F9F9] text-gray-400 "
                  }`}
                >
                  {s < step ? <FiCheckCircle /> : s}
                </div>
                <span
                  className={`text-xs mt-2 ${s === step ? "text-[#F468BB] font-medium" : "text-gray-500"}`}
                >
                  {s === 1 && "Account"}
                  {s === 2 && "Shop"}
                  {s === 3 && "Services"}
                  {s === 4 && "Machines"}
                  {s === 5 && "Payment"}
                </span>
              </div>
            ))}
            <div className="absolute left-0 top-4 w-full">
              <div
                className="h-0.5 bg-gray-200"
                style={{ width: "100%", zIndex: -1 }}
              />
              <div
                className="h-0.5 bg-[#F468BB] transition-all duration-300"
                style={{ width: `${(step - 1) * 25}%`, zIndex: -1 }}
              />
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white  rounded-lg overflow-hidden">
          <div className="bg-[#F8F3EA] px-6 py-4">
            <h2 className="text-xl font-medium text-[#3D4EB0]">
              {step === 1 && "Create Your Account"}
              {step === 2 && "Shop Details"}
              {step === 3 && "Services Offered"}
              {step === 4 && "Add Machines"}
              {step === 5 && "Payment Methods"}
            </h2>
            <p className="text-[#3D4EB0] text-opacity-80 mt-1 text-sm">
              {step === 1 && "Step 1: Set up your admin account credentials"}
              {step === 2 && "Step 2: Tell us about your laundry shop"}
              {step === 3 && "Step 3: Select services your shop offers"}
              {step === 4 && "Step 4: Add your available machines"}
              {step === 5 && "Step 5: Choose accepted payment methods"}
            </p>
          </div>

          <form className="p-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded">
                <div className="flex items-center">
                  <div className="flex-shrink-0 text-red-400">
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Account Information */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Name
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiUser className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="name"
                      type="text"
                      required
                      className="text-sm pl-10 block w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F468BB] focus:border-[#F468BB] transition-colors"
                      placeholder="Your full name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiMail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      required
                      className="text-sm pl-10 block w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F468BB] focus:border-[#F468BB] transition-colors"
                      placeholder="Your email address"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Password
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiLock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      type="password"
                      required
                      className="text-sm pl-10 block w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F468BB] focus:border-[#F468BB] transition-colors"
                      placeholder="Create a secure password"
                      value={formData.password}
                      onChange={handlePasswordChange}
                    />
                  </div>
                  {passwordErrors.length > 0 && (
                    <div className="mt-2 p-3 bg-[#F8F9FE] rounded-md">
                      <h4 className="text-sm font-medium text-gray-700">
                        Password requirements:
                      </h4>
                      <ul className="mt-1 text-xs space-y-1">
                        {[
                          {
                            text: "At least 8 characters long",
                            error: passwordErrors.includes(
                              "Password must be at least 8 characters long"
                            ),
                          },
                          {
                            text: "At least one uppercase letter",
                            error: passwordErrors.includes(
                              "Password must contain at least one uppercase letter"
                            ),
                          },
                          {
                            text: "At least one lowercase letter",
                            error: passwordErrors.includes(
                              "Password must contain at least one lowercase letter"
                            ),
                          },
                          {
                            text: "At least one number",
                            error: passwordErrors.includes(
                              "Password must contain at least one number"
                            ),
                          },
                          {
                            text: "At least one special character",
                            error: passwordErrors.includes(
                              "Password must contain at least one special character (!@#$%^&*)"
                            ),
                          },
                        ].map((item, idx) => (
                          <li
                            key={idx}
                            className={`flex items-center ${item.error ? "text-red-600" : "text-green-600"}`}
                          >
                            {item.error ? (
                              <svg
                                className="h-4 w-4 mr-1"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="h-4 w-4 mr-1"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                            {item.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Confirm Password
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiLock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="confirmPassword"
                      type="password"
                      required
                      className="text-sm pl-10 block w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F468BB] focus:border-[#F468BB] transition-colors"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirmPassword: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Shop Details */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="shopName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Shop Name
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiHome className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="shopName"
                        type="text"
                        required
                        className="text-sm pl-10 block w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F468BB] focus:border-[#F468BB] transition-colors"
                        placeholder="Your shop name"
                        value={formData.shop_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            shop_name: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="shopType"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Shop Type
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <select
                        id="shopType"
                        required
                        className="text-sm block w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F468BB] focus:border-[#F468BB] transition-colors appearance-none bg-white"
                        value={formData.shop_type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            shop_type: e.target.value,
                          })
                        }
                      >
                        <option value="self-service">Self-Service</option>
                        <option value="pickup-delivery">
                          Pickup & Delivery
                        </option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="shopAddress"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Shop Address
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiHome className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="shopAddress"
                      type="text"
                      required
                      className="text-sm pl-10 block w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F468BB] focus:border-[#F468BB] transition-colors"
                      placeholder="Shop address"
                      value={formData.shop_address}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          shop_address: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="shopPhone"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Contact Number
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiPhone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="shopPhone"
                        type="tel"
                        required
                        className="text-sm pl-10 block w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F468BB] focus:border-[#F468BB] transition-colors"
                        placeholder="Phone number"
                        value={formData.shop_phone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            shop_phone: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="shopEmail"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Shop Email
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiMail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="shopEmail"
                        type="email"
                        required
                        className="text-sm pl-10 block w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F468BB] focus:border-[#F468BB] transition-colors"
                        placeholder="Shop email address"
                        value={formData.shop_email}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            shop_email: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Free Delivery
                  </label>
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center">
                      <input
                        id="freeDeliveryYes"
                        name="freeDelivery"
                        type="radio"
                        value="yes"
                        checked={formData.delivery_fee === true}
                        onChange={() =>
                          setFormData({ ...formData, delivery_fee: true })
                        }
                        className="text-sm h-4 w-4 text-[#F468BB] focus:ring-[#F468BB] border-gray-300"
                      />
                      <label
                        htmlFor="freeDeliveryYes"
                        className="ml-2 block text-sm text-gray-700"
                      >
                        Yes
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="freeDeliveryNo"
                        name="freeDelivery"
                        type="radio"
                        value="no"
                        checked={formData.delivery_fee === false}
                        onChange={() =>
                          setFormData({ ...formData, delivery_fee: false })
                        }
                        className="text-sm h-4 w-4 text-[#F468BB] focus:ring-[#F468BB] border-gray-300"
                      />
                      <label
                        htmlFor="freeDeliveryNo"
                        className="ml-2 block text-sm text-gray-700"
                      >
                        No
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Opening Hours and Days
                  </label>
                  <div className="bg-[#F8F9FE] p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                        "Sunday",
                      ].map((day) => (
                        <div key={day} className="rounded-md bg-white p-3 ">
                          <div className="flex items-center mb-2">
                            <input
                              type="checkbox"
                              id={day}
                              value={day}
                              checked={
                                formData.opening_hours[day] !== undefined
                              }
                              onChange={(e) => {
                                const updatedHours = {
                                  ...formData.opening_hours,
                                };
                                if (e.target.checked) {
                                  updatedHours[day] = {
                                    start: "09:00",
                                    end: "17:00",
                                  };
                                } else {
                                  delete updatedHours[day];
                                }
                                setFormData({
                                  ...formData,
                                  opening_hours: updatedHours,
                                });
                              }}
                              className="text-sm h-4 w-4 text-[#F468BB] focus:ring-[#F468BB] rounded"
                            />
                            <label
                              htmlFor={day}
                              className="ml-2 text-sm font-medium text-gray-700"
                            >
                              {day}
                            </label>
                          </div>

                          {formData.opening_hours[day] && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <FiClock className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                  type="time"
                                  value={formData.opening_hours[day].start}
                                  onChange={(e) => {
                                    const updatedHours = {
                                      ...formData.opening_hours,
                                      [day]: {
                                        ...formData.opening_hours[day],
                                        start: e.target.value,
                                      },
                                    };
                                    setFormData({
                                      ...formData,
                                      opening_hours: updatedHours,
                                    });
                                  }}
                                  className="pl-10 block w-full border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#F468BB] focus:border-[#F468BB]"
                                />
                              </div>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <FiClock className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                  type="time"
                                  value={formData.opening_hours[day].end}
                                  onChange={(e) => {
                                    const updatedHours = {
                                      ...formData.opening_hours,
                                      [day]: {
                                        ...formData.opening_hours[day],
                                        end: e.target.value,
                                      },
                                    };
                                    setFormData({
                                      ...formData,
                                      opening_hours: updatedHours,
                                    });
                                  }}
                                  className="pl-10 block w-full border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#F468BB] focus:border-[#F468BB]"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Services */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Choose Services
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      "Wash",
                      "Iron",
                      "Fold",
                      "Dry Cleaning",
                      "Shoe Cleaning",
                    ].map((serviceName) => (
                      <div
                        key={serviceName}
                        className={`border rounded-md p-4 cursor-pointer transition-all ${
                          formData.services.some(
                            (service) => service.name === serviceName
                          )
                            ? "border-[#F468BB] bg-pink-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => {
                          const newServices = [...formData.services];
                          const existingIndex = newServices.findIndex(
                            (service) => service.name === serviceName
                          );

                          if (existingIndex >= 0) {
                            newServices.splice(existingIndex, 1);
                          } else {
                            newServices.push({
                              service_id: Date.now(),
                              name: serviceName,
                              price_per_kg: 0,
                              description: `${serviceName} service`,
                            });
                          }
                          setFormData({ ...formData, services: newServices });
                        }}
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={serviceName}
                            checked={formData.services.some(
                              (service) => service.name === serviceName
                            )}
                            onChange={() => {}}
                            className="h-4 w-4 text-[#F468BB] focus:ring-[#F468BB] rounded"
                          />
                          <label
                            htmlFor={serviceName}
                            className="ml-2 block text-sm font-medium text-gray-700"
                          >
                            {serviceName}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Add Custom Service
                  </label>
                  <div className="flex space-x-2">
                    <div className="relative flex-grow">
                      <input
                        type="text"
                        placeholder="Custom Service Name"
                        className="text-sm block w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F468BB] focus:border-[#F468BB]"
                        value={formData.customService || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            customService: e.target.value,
                          })
                        }
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary flex items-center"
                      onClick={() => {
                        if (formData.customService?.trim()) {
                          const newServices = [
                            ...formData.services,
                            {
                              service_id: Date.now(),
                              name: formData.customService.trim(),
                              price_per_kg: 0,
                              description: `${formData.customService.trim()} service`,
                            },
                          ];
                          setFormData({
                            ...formData,
                            services: newServices,
                            customService: "",
                          });
                        }
                      }}
                    >
                      <FiPlus className="mr-2" /> Add
                    </button>
                  </div>
                </div>

                {formData.services.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Service Details
                    </label>
                    <div className="bg-[#F8F9FE] rounded-lg p-4">
                      <ul className="divide-y divide-gray-200">
                        {formData.services.map((service, index) => (
                          <li key={index} className="py-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-900">
                                {service.name}
                              </span>
                              <button
                                type="button"
                                className="text-red-500 hover:text-red-700 flex items-center text-sm"
                                onClick={() => {
                                  const newServices = [...formData.services];
                                  newServices.splice(index, 1);
                                  setFormData({
                                    ...formData,
                                    services: newServices,
                                  });
                                }}
                              >
                                <FiTrash2 className="w-4 h-4 mr-1" /> Remove
                              </button>
                            </div>

                            {/* Price per kg field */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                  Price per kg (₱)
                                </label>
                                <div className="relative rounded-md shadow-sm">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={service.price_per_kg}
                                    onChange={(e) => {
                                      const newServices = [
                                        ...formData.services,
                                      ];
                                      newServices[index] = {
                                        ...service,
                                        price_per_kg:
                                          parseFloat(e.target.value) || 0,
                                      };
                                      setFormData({
                                        ...formData,
                                        services: newServices,
                                      });
                                    }}
                                    className="text-sm pl-8 block w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F468BB] focus:border-[#F468BB]"
                                  />
                                </div>
                              </div>

                              {/* Description field */}
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                  Description
                                </label>
                                <input
                                  type="text"
                                  value={service.description}
                                  onChange={(e) => {
                                    const newServices = [...formData.services];
                                    newServices[index] = {
                                      ...service,
                                      description: e.target.value,
                                    };
                                    setFormData({
                                      ...formData,
                                      services: newServices,
                                    });
                                  }}
                                  className="text-sm block w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F468BB] focus:border-[#F468BB]"
                                  placeholder="Enter service description"
                                />
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Step 4: Machines */}
            {step === 4 && formData.shop_type === "self-service" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Add Available Machines
                  </h3>
                  <div className="bg-[#F8F9FE] rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="machineId"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Machine ID
                        </label>
                        <input
                          id="machineId"
                          type="text"
                          placeholder="Machine ID"
                          value={newMachine.machine_id}
                          onChange={(e) =>
                            setNewMachine({
                              ...newMachine,
                              machine_id: e.target.value,
                            })
                          }
                          className="text-sm block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F468BB] focus:border-[#F468BB]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="machineType"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Machine Type
                        </label>
                        <input
                          id="machineType"
                          type="text"
                          placeholder="Machine Type"
                          value={newMachine.type}
                          onChange={(e) =>
                            setNewMachine({
                              ...newMachine,
                              type: e.target.value,
                            })
                          }
                          className="text-sm block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F468BB] focus:border-[#F468BB]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 mt-4">
                      <div>
                        <label
                          htmlFor="minimumKg"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Minimum KG
                        </label>
                        <div className="relative">
                          <input
                            id="minimumKg"
                            type="number"
                            placeholder="0"
                            value={newMachine.minimum_kg || ""}
                            onChange={(e) =>
                              setNewMachine({
                                ...newMachine,
                                minimum_kg: parseInt(e.target.value, 10),
                              })
                            }
                            className="text-sm block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F468BB] focus:border-[#F468BB]"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">kg</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="minimumMinutes"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Minimum Minutes
                        </label>
                        <div className="relative">
                          <input
                            id="minimumMinutes"
                            type="number"
                            placeholder="0"
                            value={newMachine.minimum_minutes || ""}
                            onChange={(e) =>
                              setNewMachine({
                                ...newMachine,
                                minimum_minutes: parseInt(e.target.value, 10),
                              })
                            }
                            className="text-sm block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F468BB] focus:border-[#F468BB]"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">
                              min
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="pricePerKg"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Price per Minimum KG
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">₱</span>
                          </div>
                          <input
                            id="pricePerKg"
                            type="number"
                            placeholder="0.00"
                            value={newMachine.price_per_minimum_kg || ""}
                            onChange={(e) =>
                              setNewMachine({
                                ...newMachine,
                                price_per_minimum_kg: parseFloat(
                                  e.target.value
                                ),
                              })
                            }
                            className="text-sm pl-7 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F468BB] focus:border-[#F468BB]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={handleAddMachine}
                        className="btn btn-primary flex items-center w-full justify-center"
                      >
                        <FiPlus className="mr-2" /> Add Machine
                      </button>
                    </div>
                  </div>
                </div>

                {/* Display Added Machines */}
                {formData.machines && formData.machines.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-gray-800 mb-2">
                      Added Machines:
                    </h4>
                    <div className="bg-white rounded-lg  divide-y">
                      {formData.machines.map((machine, index) => (
                        <div key={index} className="p-3 hover:bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-medium text-gray-900">
                                {machine.machine_id}
                              </h5>
                              <p className="text-sm text-gray-500">
                                {machine.type}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newMachines = [...formData.machines!];
                                newMachines.splice(index, 1);
                                setFormData({
                                  ...formData,
                                  machines: newMachines,
                                });
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                            <span className="flex items-center">
                              <FiBox className="mr-1" /> {machine.minimum_kg} kg
                            </span>
                            <span className="flex items-center">
                              <FiClock className="mr-1" />{" "}
                              {machine.minimum_minutes} min
                            </span>
                            <span className="flex items-center">
                              <FiDollarSign className="mr-1" /> ₱
                              {machine.price_per_minimum_kg}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <label className="text-sm block font-medium text-gray-900 mb-3">
                  Select Payment Methods
                </label>
                <div className="text-sm grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: "cash", name: "Cash", requiresAccount: false },
                    {
                      id: "credit-card",
                      name: "Credit Card",
                      requiresAccount: false,
                    },
                    { id: "gcash", name: "GCash", requiresAccount: true },
                    {
                      id: "bank-transfer",
                      name: "Bank Transfer",
                      requiresAccount: true,
                    },
                  ].map((method, index) => {
                    // Check if this payment method is already selected
                    const isSelected = formData.payment_methods.some(
                      (pm) => pm.name === method.id
                    );

                    return (
                      <div
                        key={method.id}
                        className={`text-sm flex flex-col p-4 border rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? "border-[#F468BB] bg-pink-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div
                          className="flex items-center"
                          onClick={() => {
                            // When toggled, update the payment_methods array
                            if (isSelected) {
                              // Remove this payment method if already selected
                              setFormData({
                                ...formData,
                                payment_methods:
                                  formData.payment_methods.filter(
                                    (pm) => pm.name !== method.id
                                  ),
                              });
                            } else {
                              // Add this payment method if not already selected
                              setFormData({
                                ...formData,
                                payment_methods: [
                                  ...formData.payment_methods,
                                  {
                                    method_id:
                                      formData.payment_methods.length + 1,
                                    name: method.id,
                                    account_number: "1", // Default account number
                                  },
                                ],
                              });
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            id={method.id}
                            checked={isSelected}
                            onChange={() => {}}
                            className="text-sm h-4 w-4 text-[#F468BB] focus:ring-[#F468BB] rounded"
                          />
                          <div className="ml-3 flex items-center">
                            <label
                              htmlFor={method.id}
                              className="block font-medium text-gray-700"
                            >
                              {method.name}
                            </label>
                          </div>
                        </div>

                        {/* Account number input field for methods that require it */}
                        {method.requiresAccount && isSelected && (
                          <div className="mt-3 pl-7">
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Account Number
                            </label>
                            <input
                              type="text"
                              placeholder="Enter account number"
                              className="text-sm block w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F468BB] focus:border-[#F468BB]"
                              value={
                                formData.payment_methods.find(
                                  (pm) => pm.name === method.id
                                )?.account_number || ""
                              }
                              onChange={(e) => {
                                // Update account number for this payment method
                                setFormData({
                                  ...formData,
                                  payment_methods: formData.payment_methods.map(
                                    (pm) =>
                                      pm.name === method.id
                                        ? {
                                            ...pm,
                                            account_number: e.target.value,
                                          }
                                        : pm
                                  ),
                                });
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {formData.payment_methods.length === 0 && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
                    Please select at least one payment method to continue.
                  </p>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 flex justify-between">
              {step > 1 && (
                <button
                  type="button"
                  className="w-full btn btn-neutral text-sm"
                  onClick={handlePrevious}
                >
                  Previous
                </button>
              )}

              {step < 5 && (
                <button
                  type="button"
                  className="w-full btn btn-primary text-sm"
                  onClick={handleNext}
                >
                  Continue
                </button>
              )}

              {step === 5 && (
                <button
                  type="submit"
                  className="btn btn-primary w-full text-sm"
                  disabled={formData.payment_methods.length === 0}
                >
                  Complete Registration
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
