"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  interface FormData {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    shop_id: number;
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
    payment_methods: string[];
  }

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    shop_id: Date.now(), // Ensure shop_id is a number
    shop_name: "",
    shop_address: "",
    shop_phone: "",
    shop_email: "",
    shop_type: "self-service",
    services: [],
    payment_methods: [],
  });
  const [error, setError] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

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
    setError("");
    setStep(step + 1);
  };

  const handlePrevious = () => {
    setStep(step - 1);
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

  return (
    <div className="h-auto flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 h-auto">
        <div>
          <h2 className="mt-6 text-center text-3xl font-regular text-gray-900">
            {step === 1 && "Set Up Your Shop"}
            {step === 2 && "Set Up Your Shop"}
            {step === 3 && "What Services Do You Offer"}
            {step === 4 && "Payment Methods"}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="text-red-500 text-center text-sm">{error}</div>
          )}
          {step === 1 && (
            <div className="rounded-md shadow-sm space-y-2">
              <div>
                <input
                  type="text"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <input
                  type="email"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div>
                <input
                  type="password"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handlePasswordChange}
                />
                {passwordErrors.length > 0 && (
                  <ul className="mt-1 text-xs text-red-500 list-disc list-inside">
                    {passwordErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <input
                  type="password"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm Password"
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
          )}
          {step === 2 && (
            <div className="rounded-md shadow-sm space-y-2">
              <div>
                <input
                  type="text"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Shop Name"
                  value={formData.shop_name}
                  onChange={(e) =>
                    setFormData({ ...formData, shop_name: e.target.value })
                  }
                />
              </div>
              <div>
                <input
                  type="text"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Shop Address"
                  value={formData.shop_address}
                  onChange={(e) =>
                    setFormData({ ...formData, shop_address: e.target.value })
                  }
                />
              </div>
              <div>
                <input
                  type="tel"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Contact Number"
                  value={formData.shop_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, shop_phone: e.target.value })
                  }
                />
              </div>
              <div>
                <input
                  type="email"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Shop Email"
                  value={formData.shop_email}
                  onChange={(e) =>
                    setFormData({ ...formData, shop_email: e.target.value })
                  }
                />
              </div>
              <div>
                <select
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  value={formData.shop_type}
                  onChange={(e) =>
                    setFormData({ ...formData, shop_type: e.target.value })
                  }
                >
                  <option value="self-service">Self-Service</option>
                  <option value="pickup-delivery">Pickup & Delivery</option>
                </select>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="rounded-md shadow-sm space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Services Offered
              </label>
              {formData.services.map((service, index) => (
                <div key={index} className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Service Name"
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    value={service.name}
                    onChange={(e) => {
                      const newServices = [...formData.services];
                      newServices[index].name = e.target.value;
                      setFormData({
                        ...formData,
                        services: newServices,
                      });
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Price per Kg"
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    value={service.price_per_kg}
                    onChange={(e) => {
                      const newServices = [...formData.services];
                      newServices[index].price_per_kg = Number(e.target.value);
                      setFormData({
                        ...formData,
                        services: newServices,
                      });
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    value={service.description}
                    onChange={(e) => {
                      const newServices = [...formData.services];
                      newServices[index].description = e.target.value;
                      setFormData({
                        ...formData,
                        services: newServices,
                      });
                    }}
                  />
                </div>
              ))}
              <button
                type="button"
                className="mt-2 bg-gray-200 text-gray-700 px-2 py-1 rounded-md"
                onClick={() =>
                  setFormData({
                    ...formData,
                    services: [
                      ...formData.services,
                      {
                        service_id: Date.now(),
                        name: "",
                        price_per_kg: 0,
                        description: "",
                      },
                    ],
                  })
                }
              >
                Add Service
              </button>
            </div>
          )}
          {step === 4 && (
            <div className="rounded-md shadow-sm space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Payment Methods
              </label>
              <select
                multiple
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                value={formData.payment_methods}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    payment_methods: Array.from(
                      e.target.selectedOptions,
                      (option) => option.value
                    ),
                  })
                }
              >
                <option value="cash">Cash</option>
                <option value="credit-card">Credit Card</option>
                <option value="paypal">PayPal</option>
                <option value="bank-transfer">Bank Transfer</option>
              </select>
              <button
                type="button"
                className="mt-2 bg-gray-200 text-gray-700 px-2 py-1 rounded-md"
                onClick={() =>
                  setFormData({
                    ...formData,
                    payment_methods: [...formData.payment_methods, ""],
                  })
                }
              >
                Add Payment Method
              </button>
            </div>
          )}
          <div className="flex justify-between">
            {step > 1 && (
              <button
                type="button"
                className="group relative flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                onClick={handlePrevious}
              >
                Previous
              </button>
            )}
            {step < 4 && (
              <button
                type="button"
                className="group relative flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={handleNext}
              >
                Next
              </button>
            )}
            {step === 4 && (
              <button
                type="submit"
                className="group relative flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Submit
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
