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
  openingTime = "08:00:00", 
  closingTime = "20:00:00" 
}) {

  const businessHours = useMemo(() => {
    const daysMap = { 
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 
      'Thursday': 4, 'Friday': 5, 'Saturday': 6 
    };

    // only include non close days
    return fullSchedules
      .filter(s => Number(s.is_closed) === 0) 
      .map(s => ({
        daysOfWeek: [daysMap[s.day_of_week]],
        startTime: s.start_time,
        endTime: s.end_time,
      }));
  }, [fullSchedules]);

  const calendarEvents = useMemo(() => events.map(app => {
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
  }), [events]);

  return (
    <div className="h-[550px] calendar-modern-wrapper">
      <FullCalendar
        key={viewMode} 
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={viewMode === 'admin' ? 'dayGridMonth' : 'timeGridDay'} 
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        events={calendarEvents}
        height="100%"
        nowIndicator={true}
        businessHours={businessHours}
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
          const { isUnbilled, isUnpaid, status } = eventInfo.event.extendedProps;

          let bgColor = "bg-(--clr-primary)"; 
          let statusText = "";

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
                <span className="text-[8px] font-bold opacity-80 truncate">
                  {eventInfo.event.extendedProps.service_name}
                </span>
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