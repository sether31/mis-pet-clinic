import React from 'react';

const LoaderV2 = () => {
  return (
    <div className="flex items-center justify-center w-full min-h-[400px]">
      <div className="w-12 h-12 border-4 border-gray-200 rounded-full border-t-(--clr-primary) animate-spin"></div>
    </div>
  );
};

export default LoaderV2;