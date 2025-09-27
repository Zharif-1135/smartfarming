export default function Card({ title, value, unit }) {
  return (
    <div className="bg-white shadow rounded-lg p-4 w-full">
      <h3 className="text-sm text-gray-500">{title}</h3>
      <p className="text-2xl font-bold">{value} {unit}</p>
    </div>
  );
}
