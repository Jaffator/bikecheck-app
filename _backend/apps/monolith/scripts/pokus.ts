import profiledata from './profile_strava.json';
const simplifiedBikes = profiledata.bikes.map((bike) => {
  return {
    id: bike.id,
    name: bike.name,
  };
});
console.log(simplifiedBikes);
