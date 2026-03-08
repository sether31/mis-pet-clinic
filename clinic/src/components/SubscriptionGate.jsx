import { useOutletContext } from 'react-router-dom';
import { cloneElement } from 'react';
import { IoLockClosedOutline } from "react-icons/io5";

export default function SubscriptionGate({ children, type }) {
  const { branchData } = useOutletContext();
  
  const sub = branchData?.subscription;
  const today = new Date().toISOString().split('T')[0];
  
  const isExpired = sub?.end_date ? sub.end_date < today : true;
  const isOverLimit = type === 'appointment' 
    ? (Number(sub?.current_usage)) >= Number(sub?.appointment_limit)
    : false;

  const isLocked = isExpired || isOverLimit;

  // clone the button and force the disabled state
  return cloneElement(children, {
    disabled: isLocked || children.props.disabled,
    className: `${children.props.className} ${isLocked ? 'opacity-50 cursor-not-allowed grayscale' : ''}`,
    children: (
      <>
        {isLocked && <IoLockClosedOutline className="inline mr-1" />}
        {isLocked ? (isExpired ? "Subscription Expired" : "Limit Reached") : children.props.children}
      </>
    )
  });
}