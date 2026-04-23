import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
// components
import Slider from "./components/Slider";
import InfiniteBanner from "./components/InfiniteBanner";
import FAQ from "./components/FAQ";
// images
import HeroImage from '../../assets/images/hero-image.jpg';
import AnnounceImage from '../../assets/images/dog-announce.png'; 
import MobileImage from '../../assets/images/mobile-app.png'; 
import QRImage from '../../assets/images/qr-code.png'; 
import PetManual1 from '../../assets/images/pet-1.png'; 
import PetManual2 from '../../assets/images/pet-2.png'; 
import PetManual3 from '../../assets/images/pet-3.png'; 
import PetManual4 from '../../assets/images/pet-4.png'; 
import ClinicManual1 from '../../assets/images/clinic-1.png'; 
import ClinicManual2 from '../../assets/images/clinic-2.png'; 
import ClinicManual3 from '../../assets/images/clinic-3.png'; 
import ClinicManual4 from '../../assets/images/clinic-4.png'; 
// icons
import { LuDownload, LuMail, LuMenu, LuPhone, LuX  } from "react-icons/lu";
import { usePlatform } from "../../hooks/usePlatform";
import { FaCheckCircle } from "react-icons/fa";

const clinicManualImages = [ClinicManual1, ClinicManual2, ClinicManual3, ClinicManual4];
const userManualImages = [PetManual1, PetManual2, PetManual3, PetManual4];

const API_URL = import.meta.env.VITE_API_URL;

export default function LandingPage() {
  const { platformData } = usePlatform();
  const [hidden, setHidden] = useState(false);
  const [prevY, setPrevY] = useState(0);
  const [cycleTriggered, setCycleTriggered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("clinic");
  const [activeSection, setActiveSection] = useState("home");
  const [platformStats, setPlatformStats] = useState([]);
  const [services, setServices] = useState([]);
  const [faqs, setFaqs] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_URL}/api/public-data/get-platform-stats.php`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch platform statistics');
        }

        const result = await response.json();
        
        if(result.success) {
          setPlatformStats(result.stats);
          setServices(result.services);
          setFaqs(result.faqs)
        } else {
          throw new Error("Something went wrong");
        }
      } catch (err) {
        console.error("Stats Fetch Error:", err);
      } 
    };

    fetchStats();
  }, []);


  useEffect(() => {
    let timeout;
    const handleScroll = () => {
      const currentY = window.scrollY;
      const scrollingDown = currentY > prevY;
      const scrollingUp = currentY < prevY;

      if (scrollingDown && !cycleTriggered) {
        setCycleTriggered(true);
        setHidden(true);
        clearTimeout(timeout);
        timeout = setTimeout(() => setHidden(false), 600);
      }
      if (scrollingUp) setCycleTriggered(false);
      setPrevY(currentY);
    };

    window.addEventListener("scroll", handleScroll);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if(entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },

      { threshold: 0.1 } 
    );

    const sections = document.querySelectorAll("section");
    sections.forEach((s) => observer.observe(s));

    return () => {
      window.removeEventListener("scroll", handleScroll);
      sections.forEach((s) => observer.unobserve(s));
    };
  }, [prevY, cycleTriggered]);

  const scrollToSection = (e, id) => {
    if (e) e.preventDefault();


    const executeScroll = () => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
        window.history.pushState(null, null, `#${id}`);
        setActiveSection(id);
      }
    };

    if(isMenuOpen) {
      setIsMenuOpen(false);
      setTimeout(() => {
        executeScroll();
      }, 300); 
    } else {
      executeScroll();
    }
  };

  const capitalize = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const formatTierList = (tiers) => {
    if (!tiers || tiers.length === 0) return "premium"; 
    const capitalized = tiers.map(t => capitalize(t));
    if (capitalized.length === 1) return capitalized[0];
    if (capitalized.length === 2) return capitalized.join(" and ");
    
    // For 3+ items: "Basic, Company, and Enterprise"
    return capitalized.slice(0, -1).join(", ") + ", and " + capitalized.slice(-1);
  };

  const finalFaqData = (faqs && faqs.length > 0) 
    ? faqs.map(f => ({ 
        q: f.question, 
        a: f.answer 
      })) 
    : [
      {
        q: "How do I register my clinic?",
        a: "Simply click 'Clinic Login' and select 'Signup'. Our team will review your application within 24 hours."
      },
      {
        q: `How much does ${platformData?.platform_name || 'the platform'} cost?`,
        a: `We offer flexible tiers from ${capitalize(platformStats?.min_tier?.name)} to ${capitalize(platformStats?.max_tier?.name)} to fit your clinic's needs. Prices range from ₱${platformStats?.min_tier?.price || 0} to ₱${platformStats?.max_tier?.price || 0} per branch.`
      },
      {
        q: "Can I sell pet supplies through the platform?",
        a: `Yes. ${platformData?.platform_name || 'The platform'} includes a Product Reservation system. This feature is available to clinics on our ${formatTierList(platformStats?.shop_tiers)} subscription tiers, allowing pet owners to reserve food or medicine for pickup via the mobile app.`
      },
      {
        q: "Is there an iOS version?",
        a: `Currently, ${platformData?.platform_name || 'the platform'} is only available for Android devices. You can download the APK directly from our 'Download' section above.`
      },
      { 
        q: "Can pet owners book appointments?", 
        a: `Absolutely. Pet owners can use the ${platformData?.platform_name || 'the platform'} Mobile App to view available slots and book appointments in real-time.` 
      },
      { 
        q: "Is my data secure?", 
        a: `Yes. ${platformData?.platform_name || 'The platform'} uses industry-standard encryption to ensure all medical records and owner data are kept private and secure.` 
      }
    ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* nav */}
      <motion.header
        animate={{ y: hidden ? "-100%" : 0 }}
        transition={{ duration: 0.3 }}
        className="fixed top-0 left-0 z-50 w-full bg-white border-b shadow-sm border-white/20"
      >
        <nav className="flex items-center justify-between h-20 mx-auto container-xl">
          {/* Logo */}
          <div className="flex items-center gap-1">
            {platformData?.platform_logo && (
              <img src={`${API_URL}/${platformData?.platform_logo}`} className="w-auto h-8" alt="Logo" />
            )}
            <span className="text-2xl font-black tracking-tighter text-(--clr-primary)">
              {platformData?.platform_name || "SwiftVet"}
            </span>
          </div>

          {/* menu */}
          <div className="items-center hidden gap-8 md:flex">
            {['home', 'manuals', 'download', 'faq'].map((id) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={(e) => scrollToSection(e, id)}
                className={`text-sm font-bold uppercase tracking-wider transition-all duration-300 border-b-2 py-1 ${
                  activeSection === id 
                    ? "text-(--clr-primary) border-(--clr-primary)" 
                    : "text-slate-700 border-transparent hover:text-(--clr-primary) hover:border-(--clr-primary)"
                }`}
              >
                {id}
              </a>
            ))}

            <Link 
              to="/clinic/login" 
              className="px-6 py-3 text-sm font-bold tracking-wider uppercase transition-all duration-300 bg-(--clr-primary) rounded-lg text-white active:scale-95"
            >
              Clinic Login
            </Link>
          </div>

          {/* mobile */}
          <button 
            className="p-2 text-slate-900 md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <LuX size={28} /> : <LuMenu size={28} />}
          </button>
        </nav>

        {/* mobile menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden bg-white border-b md:hidden border-slate-100"
            >
              <div className="flex flex-col items-center h-screen gap-4 px-6 pt-15">
                {['home', 'manuals', 'download', 'faq'].map((id) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    onClick={(e) => {
                      scrollToSection(e, id);
                      setIsMenuOpen(false);   
                    }}
                    className="text-lg font-bold tracking-wide uppercase text-slate-700"
                  >
                    {id}
                  </a>
                ))}
                <hr className="border-slate-100" />
                <Link 
                  to="/clinic/login"
                  className="w-full py-4 font-bold text-center text-white rounded-xl bg-(--clr-primary)"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Clinic Login
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <main>
        {/* hero section */}
        <section 
          id="home" 
          className="relative flex items-center justify-center px-6 pt-32 pb-12 lg:pt-36 lg:pb-20"
        >
          <div className="grid items-center grid-cols-1 gap-12 container-xl lg:grid-cols-2">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative w-full"
            >
              <div className="overflow-hidden aspect-square md:aspect-[4/3] rounded-3xl">
                <img 
                  src={HeroImage} 
                  alt="hero image" 
                  className="object-cover w-full h-full transition-transform duration-700 hover:scale-105" 
                />
              </div>
              <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-(--clr-primary)/10 blur-[100px] rounded-full"></div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center lg:text-left"
            >
              <h1 className="mb-6 text-4xl font-black leading-tight text-slate-900 md:text-6xl lg:text-7xl">
                Next-Gen Care for <br className="hidden md:block" />
                <span className="text-(--clr-primary)">Furry Friends</span>
              </h1>
              
              <p className="max-w-xl mx-auto mb-8 text-lg font-medium text-slate-600 md:text-xl lg:mx-0">
                Managing your clinic has never been this fast. Secure, reliable, and built specifically for modern veterinary practices.
              </p>

              <div className="flex flex-col items-center justify-center gap-4 md:flex-row lg:justify-start">
                <button 
                  onClick={(e) => scrollToSection(e, 'manuals')}
                  className="px-10 py-4 text-lg font-bold text-white transition-all bg-(--clr-primary) cursor-pointer rounded-xl  hover:-translate-y-1 active:scale-95 w-full md:w-auto"
                >
                  Get Started
                </button>
                
                <button 
                  onClick={(e) => scrollToSection(e, 'download')}
                  className="px-10 py-4 text-lg font-bold text-(--clr-primary) transition-all border-2 border-(--clr-primary)/20 cursor-pointer rounded-xl hover:bg-(--clr-primary)/5 w-full md:w-auto"
                >
                  Download App
                </button>
              </div>
            </motion.div>

          </div>
        </section>

        <InfiniteBanner items={services} direction="left" />

        {/* stats */}
        <section id="stats" className="py-16 text-white bg-slate-900 md:py-20">
          <div className="px-6 mx-auto container-xl">
            <div className="grid grid-cols-1 gap-10 text-center md:grid-cols-3">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <h3 className="mb-2 text-4xl font-black text-gray-100 md:text-5xl">
                  {platformStats?.clinics || 0}+
                </h3>
                <p className="text-sm font-bold tracking-widest text-gray-200 uppercase">Partner Clinics</p>
              </motion.div>
              
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <h3 className="mb-2 text-4xl font-black text-gray-100 md:text-5xl">
                  {platformStats?.users?.toLocaleString() || 0}+
                </h3>
                <p className="text-sm font-bold tracking-widest text-gray-200 uppercase">Active Users</p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <h3 className="mb-2 text-4xl font-black text-gray-100 md:text-5xl">
                  {platformStats?.impact?.toLocaleString() || 0}+
                </h3>
                <p className="text-sm font-bold tracking-widest text-gray-200 uppercase">Completed Services</p>
              </motion.div>
              
            </div>
          </div>
        </section>

        <InfiniteBanner items={services} direction="right" />

        {/* manual section */}
        <section id="manuals" className="relative bg-gray-100">
          <div className="relative z-10 px-6 pt-24 pb-12 mx-auto text-center container-xl">
            <h2 className="mb-6 text-4xl font-black md:text-5xl text-slate-900">Explore the System</h2>
            <p className="mb-10 text-lg text-slate-500">Select a manual to see how {platformData?.platform_name} simplifies your workflow.</p>
            
            <div className="relative inline-flex p-1 mb-4 bg-slate-100 rounded-2xl isolate">
              {['clinic', 'user'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  // Removed the hardcoded background, added relative and z-index
                  className={`relative px-8 py-3 rounded-xl font-bold transition-colors duration-300 cursor-pointer z-10 ${
                    activeTab === tab ? "text-white" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {/* The Twist: Sliding animated background */}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute inset-0 bg-(--clr-primary) rounded-xl -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-20">
                    {tab === 'clinic' ? 'Clinic Owner' : 'Pet Owner'}
                  </span>
                </button>
              ))}
            </div>

            <div className="absolute bottom-0 z-30 hidden pointer-events-none right-6 md:right-12 lg:block">
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
              >
                <div className="relative">
                  <div className="absolute -top-10 -left-12 bg-blue-600 text-white px-3 py-1 rounded-lg rounded-br-none text-[10px] font-bold shadow-sm whitespace-nowrap">
                    See how it works!
                  </div>
                  <img src={AnnounceImage} alt="Mascot" className="h-auto w-35 drop-shadow-xl" />
                </div>
              </motion.div>
            </div>
          </div>

          {/* slider */}
          <Slider images={activeTab === "clinic" ? clinicManualImages : userManualImages} />
        </section>
        
        {/* download */}
        <section id="download" className="relative py-12 lg:py-6 overflow-hidden text-white bg-(--clr-primary) lg:text-left">
          <div className="grid items-center grid-cols-1 px-6 mx-auto lg:gap-16 container-xl lg:grid-cols-2">
            
            {/* left section */}
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              whileInView={{ y: 60, opacity: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="relative flex justify-center order-2 lg:order-1"
            >
              <img 
                src={MobileImage} 
                alt={`${platformData?.platform_name} Mobile app picture`}
                className="w-auto h-auto max-h-[500px] md:max-h-[600px] object-contain drop-shadow-[0_35px_35px_rgba(0,0,0,0.5)] z-10" 
              />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-emerald-400/20 blur-[120px] rounded-full"></div>
            </motion.div>

            {/* right section */}
            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              className="order-1 lg:order-2"
            >
              <h2 className="mb-6 text-4xl font-black tracking-tight md:text-6xl">
                {platformData?.platform_name} for <span className="text-emerald-300">Pet Owners</span>
              </h2>
              
              <p className="mb-8 text-lg font-medium text-emerald-50/80 md:text-xl">
                Your pet's health, now in your pocket. Seamlessly book appointments, track medical history, and manage clinic visits.
              </p>

              {/* features */}
              <ul className="grid grid-cols-1 gap-4 mb-10 md:items-start md:grid-cols-2 text-emerald-50/90">
                <li className="flex items-center gap-2"><FaCheckCircle /> Real-time Booking</li>
                <li className="flex items-center gap-2"><FaCheckCircle /> Medical Records</li>
                <li className="flex items-center gap-2"><FaCheckCircle /> Product Reservations</li>
                <li className="flex items-center gap-2"><FaCheckCircle /> Instant Notifications</li>
              </ul>

              <div className="flex flex-col items-center gap-6 sm:flex-row lg:justify-start">
                {/* download btn */}
                <div className="flex flex-col gap-2">
                  <a 
                    href="/SwiftVet.apk" 
                    download="SwiftVet.apk"
                    className="inline-flex items-center justify-center gap-3 px-10 py-5 text-xl font-bold text-(--clr-primary) transition-all duration-300 bg-white rounded-2xl hover:bg-emerald-50 hover:-translate-y-1 active:scale-95"
                  >
                    <span>Get the APK</span>
                    <LuDownload size={26} />
                  </a>
                  <span className="font-mono text-xs text-center text-emerald-200/60">v1.0.5 • Approx. 110.4MB</span>
                </div>

                {/* qr*/}
                <div className="flex items-center gap-3 p-3 border bg-white/10 rounded-2xl border-white/10">
                  <div className="flex items-center justify-center w-16 h-16 p-1 overflow-hidden bg-white rounded-lg">
                    <img 
                      src={QRImage}
                      alt={`Scan to download ${platformData?.platform_name}`} 
                      className="object-contain w-full h-full"
                    />
                  </div>

                  {/* Instruction Text */}
                  <p className="text-[10px] leading-tight text-emerald-100/70 max-w-[100px]">
                    Scan to download <span className="font-bold text-white">{platformData?.platform_name}</span> directly to your Android device
                  </p>
                </div>
              </div>

              <p className="mt-8 text-sm text-center sm:text-left text-emerald-200/50">
                * Requires Android 10.0 or higher.
              </p>
            </motion.div>

          </div>
        </section>

        {/* faq section */}
        <div id="faq" className="py-20 scroll-mt-20">
          <FAQ faqData={finalFaqData} />
        </div>
      </main>

      <footer className="pt-20 pb-10 bg-slate-950 text-slate-500">
        <div className="container px-8 mx-auto">
          <div className="grid grid-cols-1 gap-12 mb-16 md:grid-cols-4">
            <div className="col-span-1 md:col-span-1">
              <h3 className="flex gap-1 mb-6 text-xl font-black text-white">
                {platformData?.platform_logo && (
                  <img src={`${API_URL}/${platformData?.platform_logo}`} className="w-auto h-8" alt="Logo" />
                )}
                {platformData?.platform_name ? platformData?.platform_name : 'SwiftVet'}.
              </h3>
              <p className="text-sm leading-relaxed">Innovative software solutions for modern veterinary management. Built for speed, designed for pets.</p>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6 text-xs uppercase tracking-[0.2em]">Navigation</h4>
              <ul className="space-y-4 text-sm font-medium">
                <li><a href="#home" onClick={(e) => scrollToSection(e, 'home')} className="transition-colors hover:text-white">Platform</a></li>
                <li><a href="#manuals" onClick={(e) => scrollToSection(e, 'manuals')} className="transition-colors hover:text-white">Manuals</a></li>
                <li><a href="#download" onClick={(e) => scrollToSection(e, 'download')} className="transition-colors hover:text-white">Mobile App</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 text-xs uppercase tracking-[0.2em]">Contact us</h4>
              <ul className="space-y-4 text-sm">
                <a href={`mailto:${platformData?.platform_email}`}>
                  <li className="flex items-center gap-3 underline underline-offset-4"><LuMail className="text-blue-500" /> {platformData?.platform_email}</li>
                </a>
                <a href={`tel:${platformData?.contact_phone}`}>
                  <li className="flex items-center gap-3 underline underline-offset-4"><LuPhone className="text-blue-500" /> {platformData?.contact_phone}</li>
                </a>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-widest font-bold">
            <p>&copy; 2026 {platformData?.platform_name} Platform</p>
            <p>Designed with care for furry friends</p>
          </div>
        </div>
      </footer>
    </div>
  );
}