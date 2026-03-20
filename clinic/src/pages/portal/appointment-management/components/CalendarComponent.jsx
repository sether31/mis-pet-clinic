import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useMemo } from 'react';

export default function CalendarComponent({ 
  events = [], 
  viewMode = 'staff', 
  onEventClick, 
  fullSchedules = [],
  staffSchedule = null,
  selectedStaffId = 'all',
  openingTime = "08:00:00", 
  closingTime = "20:00:00" 
}) {

  const backgroundEvents = useMemo(() => {
    const daysMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
    const bg = [];
    const fullyClosedDayIndices = new Set(); 

    // priority block on branch closed
    fullSchedules.forEach(s => {
      if(Number(s.is_closed) === 1) {
        const dayIdx = daysMap[s.day_of_week];
        // mark day as done
        fullyClosedDayIndices.add(dayIdx); 
        
        bg.push({
          daysOfWeek: [dayIdx],
          display: 'background',
          classNames: ['unavailable-shading'],
          allDay: true
        });
      }
    });

    // check staff availability
    if(staffSchedule) {
      Object.entries(staffSchedule).forEach(([day, sched]) => {
        const dayIdx = daysMap[day];

        // add the staff schedule shading when the branch isnt close
        if(!fullyClosedDayIndices.has(dayIdx)) {
          // add shade when staff is day off
          if(sched.is_workday === false) {
            bg.push({ 
              daysOfWeek: [dayIdx], 
              display: 'background', 
              classNames: ['unavailable-shading'], 
              allDay: true 
            });
          } else {
            // add shade based on staff start and end working hours
            bg.push({ 
              daysOfWeek: [dayIdx], 
              startTime: "00:00:00", 
              endTime: sched.start, 
              display: 'background', 
              classNames: ['unavailable-shading'] 
            });
            bg.push({ 
              daysOfWeek: [dayIdx], 
              startTime: sched.end, 
              endTime: "23:59:59", 
              display: 'background', 
              classNames: ['unavailable-shading'] 
            });
          }
        }
      });
    }
    return bg;
  }, [fullSchedules, staffSchedule]);

  const finalEvents = useMemo(() => {
    const formattedApps = events.map(app => {
      const isPast = new Date(app.start) < new Date();
      const isPaid = String(app.payment_status).toLowerCase() === 'paid';
      const isUnpaid = app.status === 'billed' && !isPaid;
      const isUnbilled = isPast && app.status === 'confirmed';

      return {
        id: app.id,
        title: app.pet_name, 
        start: app.start.replace(' ', 'T'), 
        end: app.end.replace(' ', 'T'), 
        extendedProps: { ...app, isUnbilled, isUnpaid }
      };
    });

    // combine them into one array for FullCalendar
    return [...formattedApps, ...backgroundEvents];
  }, [events, backgroundEvents]);


  return (
    <div className="h-[550px] overflow-y-auto custom-scrollbar calendar-modern-wrapper pr-2">
      <FullCalendar
        key={`${viewMode}-${selectedStaffId}`} 
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={viewMode === 'admin' ? 'dayGridMonth' : 'timeGridWeek'}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        eventDisplay="block"
        events={finalEvents}
        height="100%"
        slotEventOverlap={false}
        nowIndicator={true}
        businessHours={false}
        slotMinTime={openingTime}
        slotMaxTime={closingTime}
        allDaySlot={false}
        slotLabelFormat={{
          hour: 'numeric',
          minute: '2-digit',
          omitZeroMinute: false,
          meridiem: 'short'
        }}
        // custom event design
        eventContent={(eventInfo) => {
          if(eventInfo.event.display === 'background') {
            return null; 
          }
          const { isUnbilled, isUnpaid, status } = eventInfo.event.extendedProps;

          let bgColor = "bg-(--clr-primary)"; 
          let statusText = "CONFIRMED";

          if(status === 'completed') {
            bgColor = "bg-blue-800"; 
            statusText = "COMPLETED";
          } else if(isUnpaid) {
            bgColor = "bg-red-500"; 
            statusText = "UNPAID BILL";
          } else if(isUnbilled) {
            bgColor = "bg-orange-400";
            statusText = "UNBILLED";
          } else if(status === 'pending') {
            bgColor = "bg-gray-400";
            statusText = "PENDING";
          }

          return (
            <div className={`w-full h-full pl-2 py-1 overflow-hidden text-white cursor-pointer hover:scale-97 ease-in-out duration-300 rounded-md ${bgColor}`}>
              <div className="flex flex-col leading-tight">
                {statusText && (
                  <span className="text-[7px] font-black tracking-tighter opacity-90">
                    {statusText}
                  </span>
                )}
                <span className="text-[10px] font-black uppercase truncate">
                  {eventInfo.event.title}
                </span>
                <span className="text-[8px] font-bold uppercase truncate">
                  {eventInfo.event.extendedProps.service_name}
                </span>

              
                {eventInfo.event.extendedProps && (
                  <span className="text-[7px] font-bold text-white uppercase truncate mt-0.5">
                    STAFF: {eventInfo.event.extendedProps.staff_fname} {eventInfo.event.extendedProps.staff_lname}
                  </span>
                )}
              </div>
            </div>
          );
        }}
        eventClick={(info) => {
          const data = info.event.toPlainObject();
          onEventClick(data.extendedProps); 
        }}
        // remove default style
        dayMaxEvents={true}
        eventClassNames="border-none p-0" 
        eventBackgroundColor="transparent" 
        eventBorderColor="transparent"
        buttonText={{
          today: 'Today',
          month: 'Month',
          week: 'Week',
          day: 'Day'
        }}
      />
    </div>
  );
}