export default function Payments() {
  return (
    <div className="mt-8 bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Payments
        </h3>
      </div>
      <div className="border-t border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          <p className="text-gray-500 text-center">No recent payments</p>
        </div>
      </div>
    </div>
  );
}
