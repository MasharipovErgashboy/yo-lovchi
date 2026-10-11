import RouteCard from './RouteCard';

const mockRoutes = [
  {
    id: 1,
    number: "12",
    color: "var(--route-blue)",
    name: "12-marshrut",
    direction: "Toshkent → Chirchiq",
    eta: "4",
    currentStop: 5,
    totalStops: 8,
    capacity: "Bo'sh joy ko'p",
    capacityPercent: "60-70%",
    activeBuses: 2
  },
  {
    id: 2,
    number: "15",
    color: "var(--route-green)",
    name: "15-marshrut",
    direction: "Toshkent → G'azalkent",
    eta: "8",
    currentStop: 3,
    totalStops: 7,
    capacity: "Ozroq joy bor",
    capacityPercent: "30-40%",
    activeBuses: 1
  },
  {
    id: 3,
    number: "24",
    color: "var(--route-orange)",
    name: "24-marshrut",
    direction: "Chirchiq → Bektemir",
    eta: "12",
    currentStop: 2,
    totalStops: 9,
    capacity: "To'la",
    capacityPercent: "90-100%",
    activeBuses: 1
  },
  {
    id: 4,
    number: "28",
    color: "var(--route-purple)",
    name: "28-marshrut",
    direction: "Toshkent → Yangiyo'l",
    eta: "17",
    currentStop: 7,
    totalStops: 10,
    capacity: "Bo'sh joy ko'p",
    capacityPercent: "60-70%",
    activeBuses: 2
  },
  {
    id: 5,
    number: "35",
    color: "var(--route-pink)",
    name: "35-marshrut",
    direction: "Toshkent → Ohangaron",
    eta: "25",
    currentStop: 4,
    totalStops: 8,
    capacity: "Ozroq joy bor",
    capacityPercent: "30-40%",
    activeBuses: 1
  }
];

export default function RouteList() {
  return (
    <div className="route-list">
      {mockRoutes.map(route => (
        <RouteCard key={route.id} {...route} />
      ))}
    </div>
  );
}
