// Example usage of the dataSlice in a React component
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks';
import { 
  loadAppData, 
  selectCountries, 
  selectRelationships, 
  selectAlliances, 
  selectDataLoading, 
  selectDataError 
} from './dataSlice';

export function ExampleComponent() {
  const dispatch = useAppDispatch();
  
  // Select data from the store
  const countries = useAppSelector(selectCountries);
  const relationships = useAppSelector(selectRelationships);
  const alliances = useAppSelector(selectAlliances);
  const loading = useAppSelector(selectDataLoading);
  const error = useAppSelector(selectDataError);
  
  // Load data on component mount
  useEffect(() => {
    dispatch(loadAppData());
  }, [dispatch]);
  
  if (loading) {
    return <div>Loading Map Data...</div>;
  }
  
  if (error) {
    return <div>Error: {error}</div>;
  }
  
  return (
    <div>
      <h1>Data Loaded Successfully</h1>
      <p>Countries: {countries.length}</p>
      <p>Relationships: {relationships ? 'Loaded' : 'Not loaded'}</p>
      <p>Alliances: {alliances ? 'Loaded' : 'Not loaded'}</p>
    </div>
  );
}
