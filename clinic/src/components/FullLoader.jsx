export default function FullScreenLoader({message = "Loading..."}) {
  return (
    <div
      className="fixed top-0 bottom-0 left-0 right-0 flex items-center justify-center w-screen h-screen bg-black/50 backdrop-blur-sm z-1000"
    >
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 border-4 border-white rounded-full border-t-transparent animate-spin"></div>
        <p className="mt-4 text-lg font-medium text-white">{message}</p>
      </div>
    </div>
  );
}
