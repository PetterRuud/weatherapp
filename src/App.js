import React, {useState, useEffect} from 'react';
import './App.css';

const getReadableTime = (timestamp) => {
  return new Date(timestamp * 1000).toLocaleTimeString();
}

const getDescription = (types) => {
  if (!types) return;
  return types.map(type => type.description);
}

const getTimeOfDay = () => {
  const timeOfDay = new Date();
}

const App = () => {

  const [isLoading, setLoading] = useState(false);
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
  const { name, main = {}, wind = {}, weather: types = [], sys = {}} = weather;
  return (
    <div className="app">
      <main>
        <h1 className="city">{name}</h1>
        <div className="temperature">
          <h2 className="temperature--current">{main.temp}<span>º</span></h2>
          <div>
            <div className="temperature--max">
              {main.temp_max}<span>º</span>
            </div>
            <div className="temperature--min">
              {main.temp_min}<span>º</span>
            </div>
          </div>
        </div>
        <div className="description">{getDescription(types)}</div>
       
        <div className="wind">{wind.speed}m/s</div>
       
        <div className="sun">
          <div className="sun--sunrise">{getReadableTime(sys.sunrise)}</div>
          <div className="sun--sunset">{getReadableTime(sys.sunset)}</div>
        </div>
      </main>
    </div>
  );
}

export default App;
