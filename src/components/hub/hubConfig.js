export const CHECKIN_STATUS = {
  safe: { label: "I'm safe", short: "Safe", badge: "bg-green-100 text-green-800 border-green-300", btn: "bg-green-600 hover:bg-green-700 text-white", idle: "border-green-300 text-green-700 hover:bg-green-50" },
  need_help: { label: "I need help", short: "Needs help", badge: "bg-red-100 text-red-800 border-red-300", btn: "bg-red-600 hover:bg-red-700 text-white", idle: "border-red-300 text-red-700 hover:bg-red-50" },
  can_help: { label: "I can help", short: "Can help", badge: "bg-blue-100 text-blue-800 border-blue-300", btn: "bg-blue-600 hover:bg-blue-700 text-white", idle: "border-blue-300 text-blue-700 hover:bg-blue-50" },
};

export const URGENCY = {
  low: { label: "Low", badge: "bg-green-100 text-green-800" },
  medium: { label: "Medium", badge: "bg-yellow-100 text-yellow-800" },
  high: { label: "High", badge: "bg-orange-100 text-orange-800" },
  critical: { label: "Critical", badge: "bg-red-600 text-white" },
};