import { Link, useParams } from 'react-router-dom'; // Added useParams
// components
import Header from '../../components/Header';
// image
import notFoundPic from '../../assets/images/notFound.gif';

export default function NotFoundDashboard() {
  const { branchId } = useParams(); 

  return (
    <>
      <Header />
      <div className='flex flex-col items-center justify-center h-[calc(100vh-81px)] gap-4 container-xl bg-(--clr-bg-page)'>
        <img src={notFoundPic} alt="corgi with box on his head" className='w-64 h-auto' />
        
        <div className='text-center'>
          <h1 className='text-3xl font-bold lg:text-4xl text-(--clr-text-primary)'>404 - Page Not Found</h1>
          <p className='mt-2 text-gray-500'>The page you’re looking for doesn’t exist or may have been moved.</p>
        </div>

        <Link 
          className='px-6 py-2 mt-4 font-medium rounded-md bg-(--clr-primary) text-(--clr-text-secondary) hover:opacity-90 hover:scale-95 transition-all duration-300' 
          to={`/clinic/${branchId}/portal/dashboard`}
        >
          Go Back to Dashboard
        </Link>
      </div>
    </>
  )
}