import React, { useState, useEffect } from 'react';
import { getUserData } from '../../firebase/userService';
import { collection, doc, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

// Registering necessary chart components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function Budget() {
  const [grandTotals, setGrandTotals] = useState([]);
  const [dates, setDates] = useState([]);

  // Fetch receipts and their grand totals
  const fetchGrandTotals = async () => {
    try {
      const userData = await getUserData();
      if (!userData) {
        console.error('User data not found.');
        return;
      }
  
  
      const userDocRef = doc(db, 'users', userData.uid);
      const crCollectionRef = collection(userDocRef, 'clean-receipts');
      const snapshot = await getDocs(crCollectionRef);
  
      // Initialize an object to hold totals by date
      const totalsByDate = {};
  
      snapshot.docs.forEach((docSnapshot) => {
        const receiptData = docSnapshot.data();
  
        // Access the grand_total and datetime
        let grandTotal = receiptData?.receiptInfo?.total?.grand_total;
        const datetime = receiptData?.receiptInfo?.transaction?.datetime?.seconds;
  
        // Ensure grandTotal is a number
        if (typeof grandTotal === 'string') {
          grandTotal = parseFloat(grandTotal); 
        }
  
        // Proceed only if grandTotal and datetime are valid
        if (!isNaN(grandTotal) && datetime) {
          const date = new Date(datetime * 1000).toLocaleDateString();
  
          if (!totalsByDate[date]) {
            totalsByDate[date] = 0;
          }
  
      
          totalsByDate[date] += grandTotal;
  
    
        } else {
          console.warn(`Invalid grandTotal or datetime for receipt`);
        }
      });
  
  
      // Convert the object into an array of dates and grand totals
      const totalsArray = [];
      for (const date in totalsByDate) {
        totalsArray.push({
          date,
          grandTotal: totalsByDate[date],
        });
      }
  
      // Sort the totalsArray by date
      totalsArray.sort((a, b) => new Date(a.date) - new Date(b.date));
  
      // Separate the dates and grand totals into their own arrays
      const sortedDates = totalsArray.map(item => item.date);
      const sortedTotals = totalsArray.map(item => item.grandTotal);
  
      setDates(sortedDates);
      setGrandTotals(sortedTotals);
  
    } catch (error) {
      console.error('Error fetching receipts:', error);
    }
  };
  

  // Fetch receipts on component mount
  useEffect(() => {
    fetchGrandTotals();
  }, []);

  // Prepare the data for the chart
  const chartData = {
    labels: dates, // Dates for x-axis
    datasets: [
      {
        label: 'Grand Total',
        data: grandTotals, 
        borderColor: 'rgba(255, 165, 0, 1)',  
        backgroundColor: 'rgba(255, 165, 0, 0.2)', 
        tension: 0.4, 
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, 
    plugins: {
      title: {
        display: true,
        text: 'Grand Total Over Time',
        font: {
          family: 'AovelSansRounded, sans-serif',  
          size: 20, 
          weight: 'bold',  
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        bodyFont: {
          family: 'AovelSansRounded, sans-serif',  
          size: 14,  
        },
        titleFont: {
          family: 'AovelSansRounded, sans-serif', 
          size: 16,  
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date',
          font: {
            family: 'AovelSansRounded, sans-serif',  
            size: 20,  
            weight: 'bold',
          },
        },
        ticks: {
          maxRotation: 45, // Rotate x-axis labels
          minRotation: 30,
          font: {
            family: 'AovelSansRounded, sans-serif',  
            weight: 'bold',
          },
        },
      },
      y: {
        title: {
          display: true,
          text: 'Cost ($)',
          font: {
            family: 'AovelSansRounded, sans-serif',  
            size: 20,  
            weight: 'bold',
          },
        },
        beginAtZero: true,
      },
    },
    elements: {
      point: {
        radius: 5, // Size of the points on the line
        hoverRadius: 7, // Size of the points on hover
      },
    },
  };

  return (
    <div className="Budget" style={{ height: '400px' }}>  {/* Set the height of the container */}
      <h2>Budget</h2>
      {grandTotals.length > 0 ? (
        <>
          <Line data={chartData} options={chartOptions} height={300} />  {/* Set height of the chart */}
        </>
      ) : (
        <p>No grand totals available.</p>
      )}
    </div>
  );
}

export default Budget;



