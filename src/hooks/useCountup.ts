import { useEffect, useState } from "react";

type UseCountupProps = {
  maxMinutes: number;
  maxSeconds: number;
};

const defaultTime = { minutes: 0, seconds: 0 };

export const useCountup = ({ maxMinutes, maxSeconds }: UseCountupProps) => {
  const [time, setTime] = useState({ minutes: 0, seconds: 0 });
  const [isTimeup, setIsTimeup] = useState(false);

  const incrementCountup = () => {
    if (time.minutes === maxMinutes && time.seconds === maxSeconds) {
      setIsTimeup(true);
      setTime(defaultTime);
      return;
    }

    setTime((prevTime) => {
      if (prevTime.seconds === 59) {
        // Increment minutes only when seconds reach 59
        return { minutes: prevTime.minutes + 1, seconds: 0 };
      } else {
        // Increment seconds for every other case
        return { ...prevTime, seconds: prevTime.seconds + 1 };
      }
    });
  };

  return { time, isTimeup, incrementCountup, setIsTimeup };
};
