import {useState, useEffect} from 'react';

import './App.css';

type WeatherType = {
  id: number;
  main: string;
  description: string;
  icon: string;
}


interface ListType {
  name:string;
  main:{
    temp: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    sea_level: number;
    grnd_level: number;
    humidity: number;
    temp_kf: number;
  }; 
  wind: {
    speed: number;
    deg: number;
  }; 
  weather: WeatherType[]; 
  sys: {
    pod: string;
  };
  city: {
    id: number;
    name: string;
    coord: {
      lat: number;
      lon: number;
    },
    country: string
    population: number;
    timezone: number;
    sunrise: number;
    sunset: number;
  }
}

const getReadableTime = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleTimeString();
}

const getReadableTemperature = (temperature: number) => {
  return Math.floor(temperature);
}

const getDescription = (types: WeatherType[]) => {
  if (!types) return;
  return types.map(type => <p key={type.id} className="description">{`Det er ${type.description} for faen`}</p>);
}

const getWeatherBackground = async (types: WeatherType[]) => {
  if (!types) return;
  try {
    const result = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=lOnl9COesAHugPQx9H4Cyd9trChVS0uY&q=${types[0].description}&limit=1&offset=0&rating=R&lang=no`);
    
    const {data} = await result.json();
    console.log(data);
    return data[0].images.looping.mp4;
  } catch(error) {
    throw new Error('bais');
  }

}

const App = () => {

  const [isLoading, setLoading] = useState(true);
  const [isShowMore, setShowMore] = useState(false);
  const [weather, setWeather] = useState<ListType | null>(null)
  const [background, setBackground] = useState('');

  useEffect(() => {

    async function getWeather() {
      const result = await fetch('https://api.openweathermap.org/data/2.5/weather?q=Ski,no&units=metric&APPID=a15b2ef6b4b55c75704515c09e184044&lang=no');
      const weatherData = await result.json();
      setWeather(weatherData);
      console.info(weatherData);
      const weatherBackgreound = await getWeatherBackground(weatherData.weather)
    setBackground(weatherBackgreound);
      setLoading(false);
      // setShowMore(false);
    }

    getWeather();
    
  }, [])


  
  if (isLoading || !weather) {
    return <div>Laster</div>
  }

  const { name, main, wind, weather: types, city} = weather;
  return (
    <div className="app">
      <main>
      <video className="video" autoPlay muted>
        <source src={background} type="video/mp4" />
      </video>
      <div className="content">
        <h1 className="city">Hvordan er været i {name}</h1>
        <div className="temperature">
          <h2 className="temperature--current">{getReadableTemperature(main.temp)}<span>º</span></h2>
        </div>
        {getDescription(types)}
        {isShowMore && (
          <div className="moreinfo">
            <div className="wind">{wind.speed}m/s</div>
            <div className="sun">
              <div className="sun--sunrise">{getReadableTime(city.sunrise)}</div>
              <div className="sun--sunset">{getReadableTime(city.sunset)}</div>
            </div>
          </div>
          
        )}
        </div>
      </main>
      
    </div>
  );
}

export default App;
