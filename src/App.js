import React, {useState, useEffect} from 'react';

import './App.css';

const getReadableTime = (timestamp) => {
  return new Date(timestamp * 1000).toLocaleTimeString();
}

const getReadableTemperature = (temperature) => {
  return parseInt(temperature);
}

const getDescription = (types) => {
  if (!types) return;
  return types.map(type => <p key={type.id}>{`Det er ${type.description} for faen`}</p>);
}

const getWeatherBackground = async (types) => {
  if (!types) return;
  try {
    const result = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=lOnl9COesAHugPQx9H4Cyd9trChVS0uY&q=${types[0].description}&limit=1&offset=0&rating=R&lang=no`);
    
    const {data} = await result.json();
    console.log(data);
    return `${data[0].embed_url}`;
  } catch(error) {
    throw new Error('bais');
  }

}

const App = () => {

  const [isLoading, setLoading] = useState(true);
  const [isShowMore, setShowMore] = useState(false);
  const [weather, setWeather] = useState({})

  useEffect(() => {

    async function getWeather() {
      const result = await fetch('https://api.openweathermap.org/data/2.5/weather?q=Ski,no&units=metric&APPID=a15b2ef6b4b55c75704515c09e184044&lang=no');
      const weather = await result.json();
      setWeather(weather);
      setLoading(false);
      // setShowMore(false);
    }

    getWeather();

  }, [])


  
  if (isLoading) {
    return <div>Laster</div>
  }

  console.log(weather);
  const { name, main = {}, wind = {}, weather: types, sys = {}} = weather;
  return (
    <div className="app" styles={{backgroundImage: getWeatherBackground(types)}}>
      <main>
        <h1 className="city">{name}</h1>
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
