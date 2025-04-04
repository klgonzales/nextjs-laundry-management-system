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
    payment_methods: string[];
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
            <div className="rounded-md shadow-sm space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Services Offered
              </label>

              {/* Predefined Services */}
              <div className="space-y-2">
                {["Wash", "Iron", "Fold", "Dry Cleaning", "Shoe Cleaning"].map(
                  (serviceName) => (
                    <div key={serviceName} className="flex items-center">
                      <input
                        type="checkbox"
                        id={serviceName}
                        value={serviceName}
                        checked={formData.services.some(
                          (service) => service.name === serviceName
                        )}
                        onChange={(e) => {
                          const newServices = [...formData.services];
                          if (e.target.checked) {
                            // Add the service if checked
                            newServices.push({
                              service_id: Date.now(),
                              name: serviceName,
                              price_per_kg: 0,
                              description: "",
                            });
                          } else {
                            // Remove the service if unchecked
                            const index = newServices.findIndex(
                              (service) => service.name === serviceName
                            );
                            newServices.splice(index, 1);
                          }
                          setFormData({ ...formData, services: newServices });
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label
                        htmlFor={serviceName}
                        className="ml-2 block text-sm text-gray-700"
                      >
                        {serviceName}
                      </label>
                    </div>
                  )
                )}
              </div>

              {/* Custom Service Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Add Custom Service
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Custom Service Name"
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    value={formData.customService || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        customService: e.target.value,
                      })
                    }
                  />
                  <button
                    type="button"
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                    onClick={() => {
                      if (formData.customService?.trim()) {
                        const newServices = [
                          ...formData.services,
                          {
                            service_id: Date.now(),
                            name: formData.customService.trim(),
                            price_per_kg: 0,
                            description: "",
                          },
                        ];
                        setFormData({
                          ...formData,
                          services: newServices,
                          customService: "", // Clear the input field
                        });
                      }
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Display Selected Services */}
              <div className="mt-4">
                <h4 className="text-md font-semibold text-gray-800">
                  Selected Services:
                </h4>
                <ul className="list-disc list-inside text-sm text-gray-600">
                  {formData.services.map((service, index) => (
                    <li
                      key={index}
                      className="flex justify-between items-center"
                    >
                      <span>{service.name}</span>
                      <button
                        type="button"
                        className="text-red-500 text-sm hover:underline"
                        onClick={() => {
                          const newServices = [...formData.services];
                          newServices.splice(index, 1);
                          setFormData({ ...formData, services: newServices });
                        }}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="rounded-md space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Payment Methods
              </label>
              <div className="space-y-2">
                {["cash", "credit-card", "paypal", "bank-transfer"].map(
                  (method) => (
                    <div key={method} className="flex items-center">
                      <input
                        type="checkbox"
                        id={method}
                        value={method}
                        checked={formData.payment_methods.includes(method)}
                        onChange={(e) => {
                          const selectedMethods =
                            formData.payment_methods.includes(method)
                              ? formData.payment_methods.filter(
                                  (m) => m !== method
                                )
                              : [...formData.payment_methods, method];
                          setFormData({
                            ...formData,
                            payment_methods: selectedMethods,
                          });
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label
                        htmlFor={method}
                        className="ml-2 block text-sm text-gray-700"
                      >
                        {method
                          .replace("-", " ")
                          .replace(/\b\w/g, (char) => char.toUpperCase())}
                      </label>
                    </div>
                  )
                )}
              </div>
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
