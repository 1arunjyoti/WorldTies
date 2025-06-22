const Legend = () => {
  return (
    <div className="w-full">
      <h4 className="font-bold text-md mb-2 text-gray-900 dark:text-white">Relationship Scale</h4>
      
      <div
        className="w-full h-4 rounded-md"
        style={{
          background: 'linear-gradient(to right, #e74c3c, #f1c40f, #2ecc71)',
        }}
      ></div>
      
      <div className="flex justify-between text-xs mt-1 text-gray-600 dark:text-gray-300">
        <span>Hostile</span>
        <span>Neutral</span>
        <span>Ally</span>
      </div>
    </div>
  );
};

export default Legend;