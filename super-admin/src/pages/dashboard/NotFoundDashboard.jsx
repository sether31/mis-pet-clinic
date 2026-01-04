import notFoundPic from '../../assets/images/notFound.gif';
import { Link } from 'react-router-dom';
import Header from '../../components/Header';

export default function NotFoundDashboard() {
  return (
    <>
      <Header />
      <div className='flex flex-col items-center justify-center h-screen gap-4 container-xl bg-(--clr-bg-page)'>
        <img src={notFoundPic} alt="corgi with box on his head" className='w-auto' />
        <h1 className='text-3xl font-bold lg:text-4xl'>404 - Page Not Found</h1>
        <p>The page you’re looking for doesn’t exist or may have been moved.</p>
        <Link 
          className='px-6 py-2 font-medium rounded-md bg-(--clr-primary) text-(--clr-text-secondary) hover:opacity-98 hover:scale-95 ease-in-out duration-500' 
          to="/dashboard"
        >
          Go Back to Dashboard
        </Link>
    </div>
    </>
  )
}
