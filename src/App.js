import React, {useState, useEffect} from 'react';
import { ReactComponent as Sun } from './Images/sun.svg';
import { ReactComponent as Rain } from './Images/rain.svg';
import { ReactComponent as Snow } from './Images/snow.svg';
import { ReactComponent as SunCloud } from './Images/suncloud.svg';
import { ReactComponent as Thunder } from './Images/thunder.svg';
import { ReactComponent as Windy } from './Images/windy.svg';

import './App.css';

const getReadableTime = (timestamp) => {
  return new Date(timestamp * 1000).toLocaleTimeString();
}

const getReadableTemperature = (temperature) => {
  return parseInt(temperature);
}

const getDescription = (types) => {
  if (!types) return;
  return types.map(type => `Det er ${type.description} for faen`);
}

const getWeatherIcon = (types) => {
  if (!types) return;
  return types.map(type => {
    switch(type.id) {
      case 804:
        return <Windy />
      case 801:
        return <SunCloud />
      case 802:
        return <Thunder />
      case 600:
        return <Snow />
      case 'Rain':
        return <Rain />
      case 800:
          return <Sun />
      default:
        return <Sun />;
    }
  });
}

const App = () => {

  const [isLoading, setLoading] = useState(false);
  const [isShowMore, setShowMore] = useState(false);
  const [weather, setWeather] = useState({})

  useEffect(() => {

    async function getWeather() {
      setLoading(true);
      const result = await fetch('https://api.openweathermap.org/data/2.5/weather?q=Ski,no&units=metric&APPID=a15b2ef6b4b55c75704515c09e184044&lang=no');
      const weather = await result.json();
      setWeather(weather);
      setLoading(false);
    }

    getWeather();
  }, [])


  
  if (isLoading) {
    return <div>Laster</div>
  }

  console.log(weather);
  const { name, main = {}, wind = {}, weather: types, sys = {}} = weather;
  return (
    <div className="app">
      <main>
        <h1 className="city">{name}</h1>
        {getWeatherIcon(types)}
        <div className="temperature">
          <h2 className="temperature--current">{getReadableTemperature(main.temp)}<span>º</span></h2>
        </div>
        <div className="description">{getDescription(types)}</div>
        {isShowMore && (
          <div className="moreinfo">
            <div className="wind">{wind.speed}m/s</div>
            <div className="sun">
              <div className="sun--sunrise">{getReadableTime(sys.sunrise)}</div>
              <div className="sun--sunset">{getReadableTime(sys.sunset)}</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
