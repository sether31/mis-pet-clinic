export default function FullScreenLoader({message = "Loading..."}) {
  return (
    <div
      className="
        fixed
        top-0 left-0 right-0 bottom-0
        w-screen h-screen
        bg-black/50 backdrop-blur-sm
        flex items-center justify-center
        z-[1000]
      "
    >
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        <p className="text-white mt-4 text-lg font-medium">{message}</p>
      </div>
    </div>
  );
}
