export default function HealthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Health Check
        </h1>
        <p className="text-gray-600">
          Application is running successfully
        </p>
        <div className="mt-4 text-sm text-gray-500">
          <p>Status: Healthy</p>
          <p>Environment: {process.env.NODE_ENV || 'development'}</p>
          <p>Timestamp: {new Date().toISOString()}</p>
        </div>
      </div>
    </div>
  );
}
