import Header from "../../../components/Header";

const API_URL = import.meta.env.VITE_API_URL;

export default function Analytics() {

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <section className='px-6 my-6 container-xl'>
        <div className="flex flex-col justify-between gap-4 mb-6 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            <p className="text-gray-500"></p>
          </div>
        </div>
      </section>
    </div>
  );
}