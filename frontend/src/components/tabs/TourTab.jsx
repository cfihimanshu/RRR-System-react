import React, { useState, useEffect } from 'react';
import FilePreviewModal from '../shared/FilePreviewModal';
import api from '../../api/axios';
import {
  Plane,
  PlusCircle,
  Receipt,
  ShieldCheck,
  BookOpen,
  Info,
  Car,
  Train,
  Bus,
  Coffee,
  Utensils,
  Soup,
  Check,
  Calculator,
  UploadCloud,
  FileCheck,
  MessageSquare,
  X,
  Users,
  Clock,
  Home,
  Wrench,
  AlertCircle,
  Globe,
  Lock
} from 'lucide-react';

const POPULAR_CITIES = [
  "Ahmedabad", "Agra", "Amritsar", "Aurangabad", "Bengaluru (Bangalore)",
  "Bhopal", "Bhubaneswar", "Chandigarh", "Chennai", "Coimbatore",
  "Dehradun", "Delhi / NCR", "Dhanbad", "Ernakulam (Kochi)", "Faridabad",
  "Ghaziabad", "Goa", "Gurugram (Gurgaon)", "Guwahati", "Gwalior",
  "Hyderabad", "Indore", "Jabalpur", "Jaipur", "Jalandhar", "Jammu",
  "Jamnagar", "Jamshedpur", "Jodhpur", "Kanpur", "Kochi", "Kolkata",
  "Kota", "Lucknow", "Ludhiana", "Madurai", "Mangaluru (Mangalore)",
  "Meerut", "Mumbai", "Mysuru (Mysore)", "Nagpur", "Nashik",
  "Navi Mumbai", "Noida", "Patna", "Pune", "Raipur", "Rajkot",
  "Ranchi", "Surat", "Thiruvananthapuram", "Tiruchirappalli", "Vadodara",
  "Varanasi", "Vijayawada", "Visakhapatnam"
];

export default function TourTab({ user }) {
  const isAdmin = user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role === 'SuperAdmin';
  const [activeTab, setActiveTab] = useState('request');
  const [previewFileUrl, setPreviewFileUrl] = useState(null);
  const [previewFileName, setPreviewFileName] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [dbRequests, setDbRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  // Helper to trigger toast
  const triggerToast = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3200);
  };

  // Fetch real requests from backend
  const fetchTours = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tours');
      setDbRequests(res.data);
      if (res.data.length > 0) {
        setReimLink(prev => prev || res.data[0].reqId);
      }
    } catch (error) {
      console.error('Error fetching tours:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTours();
  }, []);

  // ==================== TAB 1: TRAVEL REQUEST STATE ====================
  const [employeeInfo, setEmployeeInfo] = useState({
    name: user?.fullName || '',
    empId: user?.empId || '',
    department: user?.department || '',
    designation: user?.designation || '',
    manager: user?.manager || '',
    contact: user?.contact || ''
  });

  useEffect(() => {
    if (user) {
      setEmployeeInfo(prev => ({
        ...prev,
        name: user.fullName || user.name || '',
        department: user.department || '',
        designation: user.designation || '',
        empId: user.empId || '',
        manager: user.manager || '',
        contact: user.contact || ''
      }));
    }
  }, [user]);

  const [tripDetails, setTripDetails] = useState({
    purpose: 'Client Meeting',
    project: '',
    departureCity: '',
    destinationCity: '',
    departureDate: '',
    returnDate: '',
    description: ''
  });
  const [customPurpose, setCustomPurpose] = useState('');
  const [editingRequestId, setEditingRequestId] = useState(null);

  const [departureSuggestions, setDepartureSuggestions] = useState([]);
  const [showDepartureSuggestions, setShowDepartureSuggestions] = useState(false);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);

  const handleDepartureCityChange = (val) => {
    setTripDetails(prev => ({ ...prev, departureCity: val }));
    if (val.trim().length >= 1) {
      const filtered = POPULAR_CITIES.filter(city =>
        city.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 10);
      setDepartureSuggestions(filtered);
      setShowDepartureSuggestions(true);
    } else {
      setDepartureSuggestions([]);
      setShowDepartureSuggestions(false);
    }
  };

  const handleDestinationCityChange = (val) => {
    setTripDetails(prev => ({ ...prev, destinationCity: val }));
    if (val.trim().length >= 1) {
      const filtered = POPULAR_CITIES.filter(city =>
        city.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 10);
      setDestinationSuggestions(filtered);
      setShowDestinationSuggestions(true);
    } else {
      setDestinationSuggestions([]);
      setShowDestinationSuggestions(false);
    }
  };

  const [departments, setDepartments] = useState([]);
  const [usersList, setUsersList] = useState([]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get('/tours/departments');
        if (Array.isArray(res.data)) {
          setDepartments(res.data);
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
      }
    };
    fetchDepartments();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/auth/users');
        if (Array.isArray(res.data)) {
          // Exclude Admin and Super Admin roles
          const filtered = res.data.filter(u =>
            u.role !== 'Admin' &&
            u.role !== 'Super Admin' &&
            u.role !== 'SuperAdmin'
          );
          setUsersList(filtered);
        }
      } catch (err) {
        console.error('Error fetching users for TourTab filter:', err);
      }
    };
    fetchUsers();
  }, []);

  const [travelMode, setTravelMode] = useState('Flight');
  const [bookingRef, setBookingRef] = useState('');
  const [travelClass, setTravelClass] = useState('Economy');
  const [estimatedFare, setEstimatedFare] = useState('');
  const [distanceKm, setDistanceKm] = useState('0');

  const [prevMode, setPrevMode] = useState('');
  const [prevDist, setPrevDist] = useState('');

  useEffect(() => {
    if (travelMode !== prevMode || distanceKm !== prevDist) {
      setPrevMode(travelMode);
      setPrevDist(distanceKm);
      if (['Owned vehicle', 'Cab / Taxi', 'Bus'].includes(travelMode)) {
        const dist = Number(distanceKm) || 0;
        setEstimatedFare(Math.round(dist * 10));
      } else {
        setEstimatedFare('');
      }
    }
  }, [travelMode, distanceKm, prevMode, prevDist]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const fetchRequestDistance = async () => {
        if (tripDetails.departureCity && tripDetails.destinationCity) {
          try {
            const res = await api.get('/distance', {
              params: {
                from: tripDetails.departureCity,
                to: tripDetails.destinationCity
              }
            });
            if (res.data && res.data.distance_km !== undefined) {
              setDistanceKm(String(res.data.distance_km));
            }
          } catch (err) {
            console.error('Error fetching request distance:', err);
          }
        } else {
          setDistanceKm('0');
        }
      };
      fetchRequestDistance();
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [travelMode, tripDetails.departureCity, tripDetails.destinationCity]);

  const [meals, setMeals] = useState({
    breakfast: true,
    lunch: true,
    dinner: true
  });
  const [mealDays, setMealDays] = useState('');
  const [mealRate, setMealRate] = useState(600);

  useEffect(() => {
    const count = (meals.breakfast ? 1 : 0) + (meals.lunch ? 1 : 0) + (meals.dinner ? 1 : 0);
    setMealRate(count * 200);
  }, [meals]);

  const [accommodation, setAccommodation] = useState({
    hotelName: '',
    checkIn: '',
    checkOut: '',
    nights: '',
    rate: '',
    bookingRef: ''
  });

  const [additionalExpenses, setAdditionalExpenses] = useState({
    toll: { amount: '', enabled: false },
    local: { amount: '', enabled: false },
    parking: { amount: '', enabled: false },
    visa: { amount: '', enabled: false },
    comm: { amount: '', enabled: false },
    misc: { amount: '', enabled: false }
  });

  const [advanceRequested, setAdvanceRequested] = useState('');
  const [advanceMode, setAdvanceMode] = useState('Bank Transfer (NEFT)');
  const [specialRemarks, setSpecialRemarks] = useState('');
  const [preTravelFiles, setPreTravelFiles] = useState([]);

  // Calculate estimated total cost
  const calculatedTotalCost = () => {
    let sum = Number(estimatedFare) || 0;
    sum += (Number(mealDays) || 0) * (Number(mealRate) || 0);
    sum += (Number(accommodation.nights) || 0) * (Number(accommodation.rate) || 0);
    Object.keys(additionalExpenses).forEach(key => {
      if (key === 'toll' && ['Flight', 'Train'].includes(travelMode)) return;
      if (key === 'visa' && travelMode !== 'Flight') return;

      const amt = Number(additionalExpenses[key].amount);
      if (amt > 0) {
        sum += amt;
      }
    });
    return Math.round(sum);
  };

  const handleEditTourRequest = (req) => {
    setEditingRequestId(req._id);

    // Set employee info
    setEmployeeInfo({
      name: req.requestedByName || user?.fullName || '',
      department: req.department || user?.department || '',
      designation: req.designation || user?.designation || '',
      empId: req.empId || user?.empId || '',
      manager: req.manager || user?.manager || '',
      contact: req.contact || user?.contact || ''
    });

    // Set trip details
    const standardPurposes = ['Client Meeting', 'Conference / Seminar', 'Internal Review', 'Training / Workshop', 'Other'];
    const isStandardPurpose = standardPurposes.includes(req.purpose);
    setTripDetails({
      purpose: isStandardPurpose ? req.purpose : 'Other',
      project: req.project || '',
      departureCity: req.destinationFrom || '',
      destinationCity: req.destinationTo || '',
      departureDate: req.startDate || '',
      returnDate: req.endDate || '',
      description: req.details || ''
    });
    setCustomPurpose(isStandardPurpose ? '' : req.purpose);

    // Travel Mode & Distance
    setTravelMode(req.travellingBy || 'Flight');
    setBookingRef(req.bookingRef || '');
    setTravelClass(req.travelClass || 'Economy');
    setDistanceKm(req.distanceKm || '0');

    // Meals
    if (req.food) {
      setMeals({
        breakfast: req.food.breakfast || false,
        lunch: req.food.lunch || false,
        dinner: req.food.dinner || false
      });
    }
    setMealDays(req.mealDays || '');
    setMealRate(req.mealRate || 600);

    // Accommodation
    setAccommodation({
      hotelName: req.hotelName || '',
      checkIn: req.startDate || '', // fallback
      checkOut: req.endDate || '', // fallback
      nights: req.hotelNights || '',
      rate: req.hotelRate || '',
      bookingRef: req.hotelBookingRef || ''
    });

    // Additional Expenses
    const newAddExp = {
      toll: { amount: '', enabled: false },
      local: { amount: '', enabled: false },
      parking: { amount: '', enabled: false },
      visa: { amount: '', enabled: false },
      comm: { amount: '', enabled: false },
      misc: { amount: '', enabled: false }
    };
    if (req.otherExpenses && Array.isArray(req.otherExpenses)) {
      req.otherExpenses.forEach(exp => {
        if (newAddExp[exp.name]) {
          newAddExp[exp.name] = { amount: exp.amount || '', enabled: true };
        }
      });
    }
    setAdditionalExpenses(newAddExp);

    // Advance & Remarks
    setAdvanceRequested(req.advanceRequested || '');
    setAdvanceMode(req.advanceMode || 'Bank Transfer (NEFT)');
    setSpecialRemarks(req.specialRemarks || '');

    if (req.preTravelDocuments && Array.isArray(req.preTravelDocuments)) {
      setPreTravelFiles(req.preTravelDocuments.map(docStr => {
        if (docStr.includes('|')) {
          const parts = docStr.split('|');
          return { name: parts[0], url: parts[1], uploading: false };
        }
        return { name: docStr.split('/').pop(), url: docStr, uploading: false };
      }));
    } else {
      setPreTravelFiles([]);
    }

    // Scroll to form top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    triggerToast(`Editing Travel Request ${req.reqId}`);
  };

  const uploadFiles = async (files, setFilesState) => {
    for (let file of files) {
      const tempId = Math.random().toString(36).substring(7);
      setFilesState(prev => [...prev, { id: tempId, name: file.name, url: '', uploading: true }]);
      const formData = new FormData();
      formData.append('file', file);
      try {
        const UPLOAD_URL = import.meta.env.VITE_UPLOAD_URL || 'https://serenity.herosite.pro/~fmojnedg/uploads/upload.php';
        const res = await fetch(UPLOAD_URL, {
          method: 'POST',
          body: formData
        });
        
        if (!res.ok) throw new Error('Upload failed with status: ' + res.status);
        const uploadData = await res.json();
        
        if (uploadData && uploadData.success && uploadData.url) {
          setFilesState(prev => prev.map(f => f.id === tempId ? { ...f, url: uploadData.url, uploading: false } : f));
        } else {
          throw new Error(uploadData?.error || 'No URL returned');
        }
      } catch (err) {
        console.error('File upload failed:', err);
        triggerToast(`Failed to upload ${file.name}`);
        setFilesState(prev => prev.filter(f => f.id !== tempId));
      }
    }
  };

  // Submit Travel Request Form to DB
  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        purpose: tripDetails.purpose === 'Other' ? customPurpose : tripDetails.purpose,
        startDate: tripDetails.departureDate,
        endDate: tripDetails.returnDate,
        destinationFrom: tripDetails.departureCity,
        destinationTo: tripDetails.destinationCity,
        distanceKm: distanceKm,
        totalTravelAmount: calculatedTotalCost(),
        travellingBy: travelMode,
        food: meals,
        preTravelDocuments: preTravelFiles
          .filter(f => f.url && !f.uploading)
          .map(f => `${f.name}|${f.url}`),
        foodAmounts: {
          breakfast: meals.breakfast ? String(Number(mealRate || 0) / 3) : '',
          lunch: meals.lunch ? String(Number(mealRate || 0) / 3) : '',
          dinner: meals.dinner ? String(Number(mealRate || 0) / 3) : ''
        },
        hotelExpense: String(Number(accommodation.rate || 0) * Number(accommodation.nights || 0)),
        otherExpenses: Object.keys(additionalExpenses)
          .filter(k => {
            if (k === 'toll' && ['Flight', 'Train'].includes(travelMode)) return false;
            if (k === 'visa' && travelMode !== 'Flight') return false;
            return Number(additionalExpenses[k].amount) > 0;
          })
          .map(k => ({ name: k, amount: String(additionalExpenses[k].amount || '') })),
        estimatedFare: Number(estimatedFare) || 0,
        advanceRequested: Number(advanceRequested) || 0,
        advanceMode: advanceMode,
        hotelName: accommodation.hotelName,
        hotelNights: Number(accommodation.nights) || 0,
        hotelRate: Number(accommodation.rate) || 0,
        hotelBookingRef: accommodation.bookingRef,
        bookingRef: ['Flight', 'Train'].includes(travelMode) ? bookingRef : '',
        travelClass: ['Flight', 'Train'].includes(travelMode) ? travelClass : '',
        department: employeeInfo.department,
        mealDays: Number(mealDays) || 0,
        mealRate: Number(mealRate) || 0,
        specialRemarks: specialRemarks,
        details: specialRemarks || tripDetails.description
      };

      let res;
      if (editingRequestId) {
        res = await api.put(`/tours/${editingRequestId}`, payload);
        triggerToast(`Request updated and resubmitted successfully!`);
        setEditingRequestId(null);
      } else {
        res = await api.post('/tours', payload);
        triggerToast(`Request submitted successfully! ID: ${res.data.reqId}`);
      }

      // Reset form fields
      setTripDetails({
        purpose: 'Client Meeting',
        project: '',
        departureCity: '',
        destinationCity: '',
        departureDate: '',
        returnDate: '',
        description: ''
      });
      setCustomPurpose('');
      setTravelMode('Flight');
      setBookingRef('');
      setTravelClass('Economy');
      setDistanceKm('0');
      setMeals({ breakfast: true, lunch: true, dinner: true });
      setMealDays('');
      setAccommodation({ hotelName: '', checkIn: '', checkOut: '', nights: '', rate: '', bookingRef: '' });
      setAdditionalExpenses({
        toll: { amount: '', enabled: false },
        local: { amount: '', enabled: false },
        parking: { amount: '', enabled: false },
        visa: { amount: '', enabled: false },
        comm: { amount: '', enabled: false },
        misc: { amount: '', enabled: false }
      });
      setAdvanceRequested('');
      setSpecialRemarks('');
      setPreTravelFiles([]);

      // Refresh DB list
      fetchTours();
    } catch (err) {
      console.error(err);
      triggerToast('Failed to submit tour request');
    }
  };

  const handleReimbursementSubmit = async (isDraft = false) => {
    if (!reimLink) {
      triggerToast('Please select a Travel Request ID');
      return;
    }

    try {
      const payload = {
        reimDate,
        actualDeparture,
        actualReturn,
        actualTravelMode,
        actualDistance: String(actualDistance || ''),
        distanceKm: String(actualDistance || ''),
        actualExpenses: {
          fare: Number(actualExpenses.fare) || 0,
          hotel: Number(actualExpenses.hotel) || 0,
          meals: Number(actualExpenses.meals) || 0,
          local: Number(actualExpenses.local) || 0,
          comm: Number(actualExpenses.comm) || 0,
          misc: Number(actualExpenses.misc) || 0
        },
        actualBillNos: {
          fare: actualBillNos.fare || '',
          hotel: actualBillNos.hotel || '',
          meals: actualBillNos.meals || '',
          local: actualBillNos.local || '',
          comm: actualBillNos.comm || '',
          misc: actualBillNos.misc || ''
        },
        actualReceipts: {
          fare: actualReceipts.fare || 'Pending',
          hotel: actualReceipts.hotel || 'Pending',
          meals: actualReceipts.meals || 'Pending',
          local: actualReceipts.local || 'Pending',
          comm: actualReceipts.comm || 'Pending',
          misc: actualReceipts.misc || 'Pending'
        },
        actualAdvanceReceived: Number(actualAdvanceReceived) || 0,
        actualAdvanceRef: actualAdvanceRef || '',
        tripOutcome,
        outcomeNextSteps,
        employeeRemarks,
        reimbursementStatus: isDraft ? 'Draft' : 'Pending',
        reimbursementBills: reimbursementFiles
          .filter(f => f.url && !f.uploading)
          .map(f => `${f.name}|${f.url}`)
      };

      await api.put(`/tours/reimbursement/${reimLink}`, payload);
      triggerToast(isDraft ? 'Reimbursement draft saved successfully!' : 'Reimbursement claim submitted successfully!');

      if (!isDraft) {
        setReimLink('');
        setActualDeparture('');
        setActualReturn('');
        setActualTravelMode('Flight');
        setActualDistance('');
        setActualExpenses({ fare: '', hotel: '', meals: '', local: '', comm: '', misc: '' });
        setActualBillNos({ fare: '', hotel: '', meals: '', local: '', comm: '', misc: '' });
        setActualReceipts({ fare: 'Pending', hotel: 'Pending', meals: 'Pending', local: 'Pending', comm: 'Pending', misc: 'Pending' });
        setActualAdvanceReceived('');
        setActualAdvanceRef('');
        setTripOutcome('');
        setOutcomeNextSteps('');
        setEmployeeRemarks('');
        setReimbursementFiles([]);
      } else {
        setReimbursementFiles([]);
      }

      // Refresh request list
      fetchTours();
    } catch (err) {
      console.error(err);
      triggerToast('Failed to save reimbursement claim');
    }
  };

  // ==================== TAB 2: REIMBURSEMENT STATE ====================
  const [reimLink, setReimLink] = useState('');
  const [reimDate, setReimDate] = useState(new Date().toISOString().split('T')[0]);
  const [actualDeparture, setActualDeparture] = useState('');
  const [actualReturn, setActualReturn] = useState('');
  const [actualTravelMode, setActualTravelMode] = useState('Flight');
  const [actualDistance, setActualDistance] = useState('');

  const [actualExpenses, setActualExpenses] = useState({
    fare: '',
    hotel: '',
    meals: '',
    local: '',
    comm: '',
    misc: ''
  });

  const [actualBillNos, setActualBillNos] = useState({
    fare: '',
    hotel: '',
    meals: '',
    local: '',
    comm: '',
    misc: ''
  });

  const [actualReceipts, setActualReceipts] = useState({
    fare: 'Pending',
    hotel: 'Pending',
    meals: 'Pending',
    local: 'Pending',
    comm: 'Pending',
    misc: 'Pending'
  });

  const [actualAdvanceReceived, setActualAdvanceReceived] = useState('');
  const [actualAdvanceRef, setActualAdvanceRef] = useState('');
  const [tripOutcome, setTripOutcome] = useState('');
  const [outcomeNextSteps, setOutcomeNextSteps] = useState('');
  const [employeeRemarks, setEmployeeRemarks] = useState('');
  const [reimbursementFiles, setReimbursementFiles] = useState([]);

  useEffect(() => {
    if (!reimLink) {
      setActualDeparture('');
      setActualReturn('');
      setActualTravelMode('Flight');
      setActualDistance('');
      setActualExpenses({ fare: '', hotel: '', meals: '', local: '', comm: '', misc: '' });
      setActualBillNos({ fare: '', hotel: '', meals: '', local: '', comm: '', misc: '' });
      setActualReceipts({ fare: 'Pending', hotel: 'Pending', meals: 'Pending', local: 'Pending', comm: 'Pending', misc: 'Pending' });
      setActualAdvanceReceived('');
      setActualAdvanceRef('');
      setTripOutcome('');
      setOutcomeNextSteps('');
      setEmployeeRemarks('');
      setReimbursementFiles([]);
      return;
    }

    if (dbRequests.length === 0) return;
    const req = dbRequests.find(r => r.reqId === reimLink);
    if (req) {
      // If the selected request already has a submitted/approved reimbursement claim,
      // we should not show it in the form. Clear reimLink to lock/clear the form!
      if (req.reimbursementStatus && req.reimbursementStatus !== '' && req.reimbursementStatus !== 'Draft') {
        setReimLink('');
        return;
      }

      setActualDeparture(req.startDate || '');
      setActualReturn(req.endDate || '');
      setActualTravelMode(req.travellingBy || 'Flight');
      setActualDistance(req.distanceKm || '');

      // Auto-fill actual expenses from saved estimated fields in DB
      setActualExpenses({
        fare: req.estimatedFare !== undefined && req.estimatedFare !== null ? req.estimatedFare : '',
        hotel: req.hotelExpense !== undefined && req.hotelExpense !== null ? req.hotelExpense : '',
        meals: (Number(req.mealDays) || 0) * (Number(req.mealRate) || 0) || '',
        local: req.otherExpenses?.find(e => e.name === 'local')?.amount || '',
        comm: req.otherExpenses?.find(e => e.name === 'comm')?.amount || '',
        misc: req.otherExpenses?.find(e => e.name === 'misc')?.amount || ''
      });

      setActualBillNos({
        fare: req.bookingRef || '',
        hotel: req.hotelBookingRef || '',
        meals: '',
        local: '',
        comm: '',
        misc: ''
      });

      setActualAdvanceReceived(req.advanceRequested !== undefined && req.advanceRequested !== null ? req.advanceRequested : '');
      setActualAdvanceRef(req.advanceMode || '');
      setTripOutcome(req.purpose || '');
      setEmployeeRemarks(req.details || '');

      if (req.reimbursementBills && Array.isArray(req.reimbursementBills)) {
        setReimbursementFiles(req.reimbursementBills.map(docStr => {
          if (docStr.includes('|')) {
            const parts = docStr.split('|');
            return { name: parts[0], url: parts[1], uploading: false };
          }
          return { name: docStr.split('/').pop(), url: docStr, uploading: false };
        }));
      } else {
        setReimbursementFiles([]);
      }
    }
  }, [reimLink, dbRequests]);

  useEffect(() => {
    const fetchDistance = async () => {
      if (reimLink && dbRequests.length > 0) {
        const req = dbRequests.find(r => r.reqId === reimLink);
        if (req && req.destinationFrom && req.destinationTo) {
          try {
            const res = await api.get('/distance', {
              params: {
                from: req.destinationFrom,
                to: req.destinationTo
              }
            });
            if (res.data && res.data.distance_km !== undefined) {
              setActualDistance(res.data.distance_km);
            }
          } catch (err) {
            console.error('Error fetching distance:', err);
          }
        }
      }
    };
    fetchDistance();
  }, [actualTravelMode, reimLink, dbRequests]);

  const calculateActualClaimed = () => {
    let sum = 0;
    Object.values(actualExpenses).forEach(val => {
      sum += Number(val) || 0;
    });
    return Math.round(sum);
  };

  const calculateNetPayable = () => {
    return calculateActualClaimed() - (Number(actualAdvanceReceived) || 0);
  };

  // ==================== TAB 3: ADMIN VIEW STATE ====================
  const [userFilter, setUserFilter] = useState('All Users');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedRequests, setExpandedRequests] = useState({});

  const toggleRequestExpand = (id) => {
    setExpandedRequests(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleAdminAction = async (id, action) => {
    try {
      const newStatus = action === 'approved' ? 'Approved' : 'Rejected';
      await api.patch(`/tours/${id}/status`, { status: newStatus });
      triggerToast(`Request ${action === 'approved' ? 'Approved' : 'Rejected'} successfully`);
      fetchTours();
    } catch (err) {
      console.error(err);
      triggerToast('Failed to update status');
    }
  };

  const handleAdminReimbursementAction = async (reqId, action) => {
    try {
      const newStatus = action === 'approved' ? 'Approved' : 'Rejected';
      await api.put(`/tours/reimbursement/${reqId}`, { reimbursementStatus: newStatus });
      triggerToast(`Reimbursement ${action === 'approved' ? 'Approved' : 'Rejected'} successfully`);
      fetchTours();
    } catch (err) {
      console.error(err);
      triggerToast('Failed to update reimbursement status');
    }
  };

  const getAdminCounts = () => {
    let list = dbRequests;
    if (userFilter !== 'All Users') {
      list = list.filter(r => r.requestedBy === userFilter);
    }

    if (typeFilter === 'Travel Requests') {
      const subList = list.filter(r => !r.reimbursementStatus || r.reimbursementStatus === '');
      return {
        pending: subList.filter(r => r.status === 'Pending Review' || r.status === 'Pending').length,
        approved: subList.filter(r => r.status === 'Approved').length,
        rejected: subList.filter(r => r.status === 'Rejected').length
      };
    } else if (typeFilter === 'Reimbursements') {
      const subList = list.filter(r => r.reimbursementStatus && r.reimbursementStatus !== '');
      return {
        pending: subList.filter(r => r.reimbursementStatus === 'Submitted' || r.reimbursementStatus === 'Pending').length,
        approved: subList.filter(r => r.reimbursementStatus === 'Approved').length,
        rejected: subList.filter(r => r.reimbursementStatus === 'Rejected').length
      };
    } else {
      // All Types
      return {
        pending: list.filter(r =>
          r.status === 'Pending Review' ||
          r.status === 'Pending' ||
          r.reimbursementStatus === 'Submitted' ||
          r.reimbursementStatus === 'Pending'
        ).length,
        approved: list.filter(r =>
          r.status === 'Approved' ||
          r.reimbursementStatus === 'Approved'
        ).length,
        rejected: list.filter(r =>
          r.status === 'Rejected' ||
          r.reimbursementStatus === 'Rejected'
        ).length
      };
    }
  };

  const adminCounts = getAdminCounts();

  const handleStatusClick = (status) => {
    setStatusFilter(prev => prev === status ? 'All' : status);
  };

  const getFilteredRequests = () => {
    return dbRequests.filter(req => {
      // Filter by userFilter
      if (userFilter !== 'All Users') {
        if (req.requestedBy !== userFilter) return false;
      }

      // Filter by typeFilter
      if (typeFilter !== 'All Types') {
        if (typeFilter === 'Travel Requests') {
          if (req.reimbursementStatus && req.reimbursementStatus !== '') return false;
        } else if (typeFilter === 'Reimbursements') {
          if (!req.reimbursementStatus || req.reimbursementStatus === '') return false;
        }
      }

      // Filter by statusFilter
      if (statusFilter !== 'All') {
        if (statusFilter === 'Pending') {
          const isRequestPending = req.status === 'Pending' || req.status === 'Pending Review';
          const isReimbursementPending = req.reimbursementStatus === 'Submitted' || req.reimbursementStatus === 'Pending';

          if (typeFilter === 'Travel Requests') {
            if (!isRequestPending) return false;
          } else if (typeFilter === 'Reimbursements') {
            if (!isReimbursementPending) return false;
          } else {
            if (!isRequestPending && !isReimbursementPending) return false;
          }
        } else if (statusFilter === 'Approved') {
          const isRequestApproved = req.status === 'Approved';
          const isReimbursementApproved = req.reimbursementStatus === 'Approved';

          if (typeFilter === 'Travel Requests') {
            if (!isRequestApproved) return false;
          } else if (typeFilter === 'Reimbursements') {
            if (!isReimbursementApproved) return false;
          } else {
            if (!isRequestApproved && !isReimbursementApproved) return false;
          }
        } else if (statusFilter === 'Rejected') {
          const isRequestRejected = req.status === 'Rejected';
          const isReimbursementRejected = req.reimbursementStatus === 'Rejected';

          if (typeFilter === 'Travel Requests') {
            if (!isRequestRejected) return false;
          } else if (typeFilter === 'Reimbursements') {
            if (!isReimbursementRejected) return false;
          } else {
            if (!isRequestRejected && !isReimbursementRejected) return false;
          }
        }
      }

      return true;
    });
  };

  const filteredRequests = getFilteredRequests();

  return (
    <div className="w-full relative">
      {/* Toast Notification */}
      <div
        className={`fixed top-5 right-5 z-[9999] bg-emerald-600 text-white px-5 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-2xl border border-emerald-500/20 transition-all duration-300 transform ${showToast ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'
          }`}
      >
        <Check size={16} /> <span>{toastMsg}</span>
      </div>

      <div className="portal-wrap bg-bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {/* HEADER */}
        <div className="sys-header flex items-center justify-between gap-4 px-6 py-5 border-b border-border bg-bg-card">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center">
              {/* <Plane size={20} className="text-white" /> */}
              <Train size={20} className="text-white" />
            </div>
            <div>
              <div className="text-xs font-black text-text-primary uppercase tracking-[0.2em]">
                Travel Management
              </div>

            </div>
          </div>
          <div className="user-chip flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-soft border border-blue-soft/30 text-blue flex items-center justify-center text-xs font-black uppercase select-none">
              {employeeInfo.name.split(' ').map(n => n[0]).join('')}
            </div>
            <span className="hidden sm:inline text-xs text-text-muted font-bold uppercase tracking-wider">
              {employeeInfo.name}
            </span>
          </div>
        </div>

        {/* TABS */}
        <div className="tab-row flex border-b border-border px-4 gap-2 bg-bg-card overflow-x-auto select-none">
          <button
            type="button"
            className={`tab-btn flex items-center gap-2 px-5 py-3.5 text-xs font-black border-b-2 transition-all uppercase tracking-[0.15em] cursor-pointer ${activeTab === 'request' ? 'text-accent border-accent font-black' : 'text-text-muted border-transparent hover:text-text-primary'
              }`}
            onClick={() => setActiveTab('request')}
          >
            <PlusCircle size={14} /> New Request
          </button>
          <button
            type="button"
            className={`tab-btn flex items-center gap-2 px-5 py-3.5 text-xs font-black border-b-2 transition-all uppercase tracking-[0.15em] cursor-pointer ${activeTab === 'reimbursement' ? 'text-accent border-accent font-black' : 'text-text-muted border-transparent hover:text-text-primary'
              }`}
            onClick={() => setActiveTab('reimbursement')}
          >
            <Receipt size={14} /> Reimbursement
          </button>
          {isAdmin && (
            <button
              type="button"
              className={`tab-btn flex items-center gap-2 px-5 py-3.5 text-xs font-black border-b-2 transition-all uppercase tracking-[0.15em] cursor-pointer ${activeTab === 'admin' ? 'text-accent border-accent font-black' : 'text-text-muted border-transparent hover:text-text-primary'
                }`}
              onClick={() => setActiveTab('admin')}
            >
              <ShieldCheck size={14} /> Admin View
            </button>
          )}
          <button
            type="button"
            className={`tab-btn flex items-center gap-2 px-5 py-3.5 text-xs font-black border-b-2 transition-all uppercase tracking-[0.15em] cursor-pointer ${activeTab === 'policy' ? 'text-accent border-accent font-black' : 'text-text-muted border-transparent hover:text-text-primary'
              }`}
            onClick={() => setActiveTab('policy')}
          >
            <BookOpen size={14} /> Travel Policy
          </button>
        </div>

        {/* ===== TAB 1: TRAVEL REQUEST ===== */}
        {activeTab === 'request' && (
          <>
            <form onSubmit={handleRequestSubmit} className="tab-panel p-4 sm:p-6 animate-zoom-in">
              <div className="info-box bg-blue-soft/30 border border-blue-soft/50 text-blue p-4 rounded-xl text-xs flex gap-3 items-start line-height-1.5 mb-6">
                <Info size={16} className="shrink-0 mt-0.5" />
                <span>
                  Submit your travel request <strong>at least 3 working days</strong> before departure. Fields marked <span className="text-red-500 font-bold">*</span> are mandatory.
                </span>
              </div>

              <div className="section-label text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 mt-8 first:mt-0">
                Employee Information
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="field flex flex-col gap-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                    Employee Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px]"
                    value={employeeInfo.name}
                    onChange={(e) => setEmployeeInfo({ ...employeeInfo, name: e.target.value })}
                    placeholder="Full name"
                    required
                  />
                </div>
                {/* <div className="field flex flex-col gap-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                  Employee ID <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px]"
                  value={employeeInfo.empId} 
                  onChange={(e) => setEmployeeInfo({ ...employeeInfo, empId: e.target.value })}
                  placeholder="EMP-XXXX" 
                  required
                />
              </div> */}
                <div className="field flex flex-col gap-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px] cursor-pointer"
                    value={employeeInfo.department}
                    onChange={(e) => setEmployeeInfo({ ...employeeInfo, department: e.target.value })}
                    required
                  >
                    <option value="">Select Role</option>
                    {departments.map((dept, idx) => (
                      <option key={idx} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                {/* <div className="field flex flex-col gap-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                  Reporting Manager <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px]"
                  value={employeeInfo.manager}
                  onChange={(e) => setEmployeeInfo({ ...employeeInfo, manager: e.target.value })}
                  placeholder="Manager name"
                  required
                />
              </div> */}
                <div className="field flex flex-col gap-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px]"
                    value={employeeInfo.contact}
                    onChange={(e) => setEmployeeInfo({ ...employeeInfo, contact: e.target.value })}
                    placeholder="+91 9XXXXXXXXX"
                    required
                  />
                </div>
              </div>

              <div className="section-label text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 mt-8">
                Trip Details
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="field flex flex-col gap-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                    Purpose of Travel <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px] cursor-pointer"
                    value={tripDetails.purpose}
                    onChange={(e) => setTripDetails({ ...tripDetails, purpose: e.target.value })}
                    required
                  >
                    <option>Client Meeting</option>
                    <option>Conference / Seminar</option>
                    <option>Training / Workshop</option>
                    <option>Business Development</option>
                    <option>Internal Meeting</option>
                    <option>Other</option>
                  </select>
                  {tripDetails.purpose === 'Other' && (
                    <div className="field flex flex-col gap-2 mt-2 animate-zoom-in">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                        Specify Purpose <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px]"
                        value={customPurpose}
                        onChange={(e) => setCustomPurpose(e.target.value)}
                        placeholder="Please specify purpose of travel"
                        required
                      />
                    </div>
                  )}
                </div>
                <div className="field flex flex-col gap-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                    Project / Client Name
                  </label>
                  <input
                    type="text"
                    className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px]"
                    value={tripDetails.project}
                    onChange={(e) => setTripDetails({ ...tripDetails, project: e.target.value })}
                    placeholder="Associated project or client"
                  />
                </div>
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="field flex flex-col gap-2 relative">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                      Departure City <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px]"
                        value={tripDetails.departureCity}
                        onChange={(e) => handleDepartureCityChange(e.target.value)}
                        onFocus={() => {
                          if (tripDetails.departureCity.trim().length >= 1) {
                            handleDepartureCityChange(tripDetails.departureCity);
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => {
                            setShowDepartureSuggestions(false);
                          }, 200);
                        }}
                        placeholder="From"
                        required
                      />
                      {showDepartureSuggestions && departureSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-bg-card border-2 border-border rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-border">
                          {departureSuggestions.map(city => (
                            <button
                              key={city}
                              type="button"
                              className="w-full text-left px-5 py-3 text-xs font-bold text-text-primary hover:bg-bg-input transition-colors cursor-pointer"
                              style={{ textAlign: 'left' }}
                              onMouseDown={() => {
                                setTripDetails(prev => ({ ...prev, departureCity: city }));
                                setShowDepartureSuggestions(false);
                              }}
                            >
                              {city}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="field flex flex-col gap-2 relative">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                      Destination City <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px]"
                        value={tripDetails.destinationCity}
                        onChange={(e) => handleDestinationCityChange(e.target.value)}
                        onFocus={() => {
                          if (tripDetails.destinationCity.trim().length >= 1) {
                            handleDestinationCityChange(tripDetails.destinationCity);
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => {
                            setShowDestinationSuggestions(false);
                          }, 200);
                        }}
                        placeholder="To"
                        required
                      />
                      {showDestinationSuggestions && destinationSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-bg-card border-2 border-border rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-border">
                          {destinationSuggestions.map(city => (
                            <button
                              key={city}
                              type="button"
                              className="w-full text-left px-5 py-3 text-xs font-bold text-text-primary hover:bg-bg-input transition-colors cursor-pointer"
                              style={{ textAlign: 'left' }}
                              onMouseDown={() => {
                                setTripDetails(prev => ({ ...prev, destinationCity: city }));
                                setShowDestinationSuggestions(false);
                              }}
                            >
                              {city}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="field flex flex-col gap-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                      Departure Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px]"
                      value={tripDetails.departureDate}
                      onChange={(e) => setTripDetails({ ...tripDetails, departureDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="field flex flex-col gap-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                      Return Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px]"
                      value={tripDetails.returnDate}
                      onChange={(e) => setTripDetails({ ...tripDetails, returnDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="field flex flex-col gap-2 md:col-span-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                    Trip Description / Agenda <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all min-h-[85px] leading-relaxed"
                    value={tripDetails.description}
                    onChange={(e) => setTripDetails({ ...tripDetails, description: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="section-label text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 mt-8">
                Mode of Travel <span className="text-red-500">*</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4 select-none">
                {[
                  { name: 'Owned vehicle', icon: Car },
                  { name: 'Cab / Taxi', icon: Car },
                  { name: 'Flight', icon: Plane },
                  { name: 'Train', icon: Train },
                  { name: 'Bus', icon: Bus }
                ].map(mode => {
                  const IconComponent = mode.icon;
                  const isSelected = travelMode === mode.name;
                  return (
                    <div
                      key={mode.name}
                      className={`flex flex-col items-center justify-center border-2 rounded-2xl p-4 text-center cursor-pointer transition-all hover:scale-[1.02] ${isSelected ? 'border-accent bg-accent/5 text-accent font-black' : 'border-border bg-bg-input/20 text-text-secondary'
                        }`}
                      onClick={() => setTravelMode(mode.name)}
                    >
                      <IconComponent size={24} className="mb-2" />
                      <span className="text-xs font-black uppercase tracking-wider">{mode.name}</span>
                    </div>
                  );
                })}
              </div>

              <div className={`grid grid-cols-1 ${['Flight', 'Train'].includes(travelMode) ? 'md:grid-cols-4' : 'md:grid-cols-2'} gap-6 mt-6`}>
                <div className="field flex flex-col gap-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                    Distance (KM)
                  </label>
                  <input
                    type="text"
                    className="w-full bg-bg-input/50 border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-muted outline-none h-[52px] cursor-not-allowed select-none"
                    value={distanceKm ? `${distanceKm} km` : '0 km'}
                    readOnly
                  />
                </div>
                {['Flight', 'Train'].includes(travelMode) && (
                  <>
                    <div className="field flex flex-col gap-2">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                        Booking / Ticket Ref.
                      </label>
                      <input
                        type="text"
                        className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px]"
                        value={bookingRef}
                        onChange={(e) => setBookingRef(e.target.value)}
                        placeholder="Booking number"
                      />
                    </div>
                    <div className="field flex flex-col gap-2">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                        Class of Travel
                      </label>
                      <select
                        className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px] cursor-pointer"
                        value={travelClass}
                        onChange={(e) => setTravelClass(e.target.value)}
                      >
                        <option>Economy</option>
                        <option>Business</option>
                        <option>First Class</option>
                        <option>AC 2 Tier</option>
                        <option>AC 3 Tier</option>
                        <option>Sleeper</option>
                      </select>
                    </div>
                  </>
                )}
                <div className="field flex flex-col gap-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                    Estimated Fare (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px] no-spinners"
                    value={estimatedFare}
                    onWheel={(e) => e.target.blur()}
                    onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                    onChange={(e) => setEstimatedFare(Number(e.target.value) || '')}
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div className="section-label text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 mt-8">
                Meals Required
              </div>
              <div className="flex gap-4 mb-4 select-none">
                {[
                  { key: 'breakfast', label: 'Breakfast', icon: Coffee },
                  { key: 'lunch', label: 'Lunch', icon: Utensils },
                  { key: 'dinner', label: 'Dinner', icon: Soup }
                ].map(meal => {
                  const IconComponent = meal.icon;
                  const isSelected = meals[meal.key];
                  return (
                    <button
                      key={meal.key}
                      type="button"
                      className={`flex-1 flex flex-col items-center justify-center p-4 border-2 rounded-2xl cursor-pointer text-xs font-black uppercase tracking-wider transition-all hover:scale-[1.02] ${isSelected ? 'border-emerald-500 bg-emerald-500/5 text-emerald-500' : 'border-border bg-bg-input/20 text-text-secondary'
                        }`}
                      onClick={() => setMeals({ ...meals, [meal.key]: !meals[meal.key] })}
                    >
                      <IconComponent size={20} className="mb-2" />
                      {meal.label}
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="field flex flex-col gap-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                    No. of days requiring meals
                  </label>
                  <input
                    type="number"
                    className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px]"
                    value={mealDays}
                    onWheel={(e) => e.target.blur()}
                    onChange={(e) => setMealDays(Number(e.target.value) || '')}
                    placeholder="Days"
                  />
                </div>
                <div className="field flex flex-col gap-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                    Meal allowance per day (₹)
                  </label>
                  <input
                    type="number"
                    className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none h-[52px] cursor-not-allowed opacity-80"
                    value={mealRate}
                    onWheel={(e) => e.target.blur()}
                    disabled
                    placeholder="As per policy"
                  />
                </div>
              </div>

              <div className="section-label text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 mt-8">
                Accommodation
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="field flex flex-col gap-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                    Hotel / Guest House Name
                  </label>
                  <input
                    type="text"
                    className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px]"
                    value={accommodation.hotelName}
                    onChange={(e) => setAccommodation({ ...accommodation, hotelName: e.target.value })}
                    placeholder="Name"
                  />
                </div>
                <div className="field flex flex-col gap-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                    Check-in Date
                  </label>
                  <input
                    type="date"
                    className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px]"
                    value={accommodation.checkIn}
                    onChange={(e) => setAccommodation({ ...accommodation, checkIn: e.target.value })}
                  />
                </div>
                <div className="field flex flex-col gap-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                    Check-out Date
                  </label>
                  <input
                    type="date"
                    className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px]"
                    value={accommodation.checkOut}
                    onChange={(e) => setAccommodation({ ...accommodation, checkOut: e.target.value })}
                  />
                </div>
                <div className="field flex flex-col gap-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                    No. of Nights
                  </label>
                  <input
                    type="number"
                    className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px] no-spinners"
                    value={accommodation.nights}
                    onWheel={(e) => e.target.blur()}
                    onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                    onChange={(e) => setAccommodation({ ...accommodation, nights: Number(e.target.value) || '' })}
                    placeholder="0"
                  />
                </div>
                <div className="field flex flex-col gap-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                    Cost per Night (₹)
                  </label>
                  <input
                    type="number"
                    className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px] no-spinners"
                    value={accommodation.rate}
                    onWheel={(e) => e.target.blur()}
                    onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                    onChange={(e) => setAccommodation({ ...accommodation, rate: Number(e.target.value) || '' })}
                    placeholder="0"
                  />
                </div>
                <div className="field flex flex-col gap-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                    Hotel Booking Ref.
                  </label>
                  <input
                    type="text"
                    className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px]"
                    value={accommodation.bookingRef}
                    onChange={(e) => setAccommodation({ ...accommodation, bookingRef: e.target.value })}
                    placeholder="Booking ID"
                  />
                </div>
              </div>

              <div className="section-label text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 mt-8">
                Additional Expenses
              </div>
              {[
                { key: 'toll', title: 'Toll / Road charges', sub: 'If using owned vehicle or cab' },
                { key: 'local', title: 'Local conveyance', sub: 'Auto, metro, cab at destination' },
                { key: 'parking', title: 'Parking charges', sub: 'Airport, station or venue parking' },
                { key: 'visa', title: 'Visa / Travel document fees', sub: 'Applicable for international travel' },
                { key: 'comm', title: 'Communication / SIM', sub: 'Roaming, data, calls' },
                { key: 'misc', title: 'Miscellaneous', sub: 'Tips, stationery, printing, etc.' }
              ]
                .filter(expense => {
                  if (expense.key === 'toll' && ['Flight', 'Train'].includes(travelMode)) return false;
                  if (expense.key === 'visa' && travelMode !== 'Flight') return false;
                  return true;
                })
                .map(expense => {
                  const expState = additionalExpenses[expense.key];
                  return (
                    <div
                      key={expense.key}
                      className="grid grid-cols-[1fr_auto] gap-4 items-center p-4 border-2 border-border rounded-2xl mb-3 bg-bg-input/5"
                    >
                      <div className="expense-label text-sm font-bold text-text-primary font-black uppercase tracking-wider">
                        {expense.title}
                        <span className="block text-[9px] font-bold text-text-muted uppercase tracking-wider mt-1 font-sans">
                          {expense.sub}
                        </span>
                      </div>
                      <input
                        type="number"
                        className="w-28 text-right bg-bg-input border-2 border-border rounded-xl px-3 py-2 text-sm font-bold text-text-primary focus:border-accent outline-none no-spinners"
                        value={expState.amount}
                        onWheel={(e) => e.target.blur()}
                        onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                        onChange={(e) => {
                          const val = e.target.value;
                          const hasVal = val !== '' && Number(val) > 0;
                          setAdditionalExpenses({
                            ...additionalExpenses,
                            [expense.key]: {
                              amount: val === '' ? '' : (Number(val) || 0),
                              enabled: hasVal
                            }
                          });
                        }}
                        placeholder="₹"
                      />
                    </div>
                  );
                })}

              <div className="total-bar flex justify-between items-center p-5 bg-bg-input/20 border-2 border-border rounded-2xl mt-6">
                <span className="total-label text-xs font-black text-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                  <Calculator size={16} /> Estimated Total Cost
                </span>
                <span className="total-amt text-2xl font-black text-text-primary font-black">
                  ₹ {calculatedTotalCost().toLocaleString('en-IN')}
                </span>
              </div>

              <div className="section-label text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 mt-8">
                Advance Required
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="field flex flex-col gap-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                    Advance amount requested (₹)
                  </label>
                  <input
                    type="number"
                    className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px] no-spinners"
                    value={advanceRequested}
                    onWheel={(e) => e.target.blur()}
                    onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                    onChange={(e) => setAdvanceRequested(Number(e.target.value) || '')}
                    placeholder="0"
                  />
                </div>
                <div className="field flex flex-col gap-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                    Advance payment mode
                  </label>
                  <select
                    className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px] cursor-pointer"
                    value={advanceMode}
                    onChange={(e) => setAdvanceMode(e.target.value)}
                  >
                    <option>Bank Transfer (NEFT)</option>
                    <option>UPI</option>
                    <option>Cash</option>
                    <option>Company Card</option>
                  </select>
                </div>
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div className="field flex flex-col gap-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                      Special instructions / Remarks
                    </label>
                    <textarea
                      className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[130px] leading-relaxed resize-none"
                      value={specialRemarks}
                      onChange={(e) => setSpecialRemarks(e.target.value)}
                      placeholder="Any special requirements, approvals needed, or notes..."
                    />
                  </div>
                  <div className="field flex flex-col gap-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                      Pre-travel Documents (optional)
                    </label>
                    <input
                      type="file"
                      multiple
                      id="pre-travel-file-input"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          uploadFiles(Array.from(e.target.files), setPreTravelFiles);
                        }
                      }}
                    />
                    <div
                      className="doc-zone border-2 border-dashed border-border rounded-2xl p-4 text-center bg-bg-input/5 hover:bg-accent/5 hover:border-accent cursor-pointer transition-all flex flex-col items-center justify-center h-[130px]"
                      onClick={() => document.getElementById('pre-travel-file-input').click()}
                    >
                      <UploadCloud size={24} className="text-text-muted mb-1.5" />
                      <p className="text-xs font-bold text-text-primary">Click to upload documents</p>
                      <p className="mt-0.5 text-[9px] font-black text-text-muted uppercase tracking-wider">PDF, JPG, PNG — max 10MB</p>
                    </div>
                    {preTravelFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {preTravelFiles.map((file, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1.5 bg-bg-input/40 border border-border px-3 py-1 rounded-full text-[10px] font-black text-text-secondary uppercase tracking-wider select-none">
                            {file.uploading ? (
                              <div className="w-3 h-3 border border-accent border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <FileCheck size={12} className="text-emerald-500" />
                            )}
                            {file.name}
                            {!file.uploading && file.url && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewFileUrl(file.url);
                                  setPreviewFileName(file.name || 'Pre-Travel Document');
                                }}
                                className="ml-1.5 text-accent hover:underline lowercase tracking-normal font-bold"
                              >
                                View
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setPreTravelFiles(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="ml-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  className="btn-secondary px-6 py-2.5 text-xs font-black uppercase tracking-[0.15em] border-2 border-border rounded-xl bg-bg-input/20 text-text-secondary hover:bg-bg-input transition-all cursor-pointer"
                  onClick={() => triggerToast('Draft saved successfully')}
                >
                  Save as Draft
                </button>
                <button
                  type="submit"
                  className="btn-primary px-6 py-2.5 text-xs font-black uppercase tracking-[0.15em] rounded-xl bg-accent text-white hover:bg-accent-hover transition-all cursor-pointer shadow-lg"
                >
                  {editingRequestId ? 'Update & Resubmit' : 'Submit Request'}
                </button>
              </div>
            </form>

            {/* List of user's submitted travel requests */}
            <div className="mt-8 p-6 bg-bg-card border-2 border-border rounded-3xl">
              <div className="text-xs font-black text-text-primary uppercase tracking-[0.2em] mb-4">
                My Submitted Travel Requests
              </div>

              {dbRequests.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {dbRequests.map(req => (
                    <div key={req._id} className="p-5 border-2 border-border rounded-2xl bg-bg-input/5 flex flex-col gap-4">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="text-[9px] font-black text-text-muted uppercase tracking-wider">
                            {req.reqId} &nbsp;·&nbsp; Travel Request
                          </div>
                          <div className="text-sm font-black text-text-primary mt-1">
                            {req.destinationFrom || '-'} to {req.destinationTo || '-'}
                          </div>
                          <div className="text-[10px] font-bold text-text-muted uppercase tracking-wide mt-0.5">
                            Status: <span className={`status-badge text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${req.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' :
                              req.status === 'Rejected' ? 'bg-rose-500/10 text-rose-500' :
                                'bg-orange-500/10 text-orange-500'
                              }`}>
                              {req.status}
                            </span>
                          </div>
                        </div>
                        {req.status === 'Rejected' && (
                          <button
                            type="button"
                            className="px-4 py-2 text-[10px] font-black uppercase tracking-wider border-2 border-accent text-accent bg-accent/5 rounded-xl hover:bg-accent hover:text-white transition-all cursor-pointer"
                            onClick={() => handleEditTourRequest(req)}
                          >
                            Edit & Resubmit
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-6 gap-y-2 py-3 border-t border-border/40 select-none text-[10px] font-bold text-text-secondary">
                        <div>Dates: <span className="text-text-primary font-black">{req.startDate} to {req.endDate}</span></div>
                        <div>Mode: <span className="text-text-primary font-black">{req.travellingBy}</span></div>
                        <div>Estimated Cost: <span className="text-text-primary font-black">₹{req.totalTravelAmount}</span></div>
                      </div>

                      {((req.preTravelDocuments && req.preTravelDocuments.length > 0) || (req.reimbursementBills && req.reimbursementBills.length > 0)) && (
                        <div className="flex flex-col gap-2 pt-3 border-t border-border/40 text-[10px] font-bold text-text-secondary">
                          {req.preTravelDocuments && req.preTravelDocuments.length > 0 && (
                            <div className="flex flex-wrap gap-2 items-center">
                              <span className="text-[9px] font-black text-text-muted uppercase tracking-wider">Pre-Travel Docs:</span>
                              {req.preTravelDocuments.map((docStr, docIdx) => {
                                const parts = docStr.split('|');
                                const name = parts[0];
                                const url = parts[1] || parts[0];
                                return (
                                  <button
                                    key={docIdx}
                                    type="button"
                                    onClick={() => {
                                      setPreviewFileUrl(url);
                                      setPreviewFileName(name || 'Pre-Travel Document');
                                    }}
                                    className="inline-flex items-center gap-1 text-[9px] font-black text-accent hover:underline lowercase tracking-normal text-left"
                                  >
                                    {name}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {req.reimbursementBills && req.reimbursementBills.length > 0 && (
                            <div className="flex flex-wrap gap-2 items-center">
                              <span className="text-[9px] font-black text-text-muted uppercase tracking-wider">Receipts & Bills:</span>
                              {req.reimbursementBills.map((docStr, docIdx) => {
                                const parts = docStr.split('|');
                                const name = parts[0];
                                const url = parts[1] || parts[0];
                                return (
                                  <button
                                    key={docIdx}
                                    type="button"
                                    onClick={() => {
                                      setPreviewFileUrl(url);
                                      setPreviewFileName(name || 'Receipt/Bill');
                                    }}
                                    className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 hover:underline lowercase tracking-normal text-left"
                                  >
                                    {name}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-text-muted font-bold">
                  No travel requests found.
                </div>
              )}
            </div>
          </>
        )}

        {/* ===== TAB 2: REIMBURSEMENT ===== */}
        {activeTab === 'reimbursement' && (
          <div className="tab-panel p-4 sm:p-6 animate-zoom-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="text-sm font-black text-text-primary uppercase tracking-wider">
                  Reimbursement Claim Form
                </div>

              </div>
              <span className="status-badge badge-review bg-blue-500/10 text-blue border-blue-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border select-none self-start sm:self-auto">
                Trip Completed
              </span>
            </div>

            <div className="info-box bg-blue-soft/30 border border-blue-soft/50 text-blue p-4 rounded-xl text-xs flex gap-3 items-start line-height-1.5 mb-6">
              <Info size={16} className="shrink-0 mt-0.5" />
              <span>
                Link this claim to your approved travel request. All original bills and receipts must be uploaded. Claims without proof will not be processed.
              </span>
            </div>

            <div className="section-label text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 mt-8 first:mt-0">
              Link to Travel Request
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="field flex flex-col gap-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                  Travel Request ID <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px] cursor-pointer"
                  value={reimLink}
                  onChange={(e) => setReimLink(e.target.value)}
                  required
                >
                  {dbRequests.filter(req => req.status === 'Approved' && (!req.reimbursementStatus || req.reimbursementStatus === '' || req.reimbursementStatus === 'Draft')).length > 0 ? (
                    <>
                      <option value="">-- Select an Approved Request --</option>
                      {dbRequests.filter(req => req.status === 'Approved' && (!req.reimbursementStatus || req.reimbursementStatus === '' || req.reimbursementStatus === 'Draft')).map(req => (
                        <option key={req._id} value={req.reqId}>
                          {req.reqId} — {req.destinationTo || '-'}, {req.startDate || '-'}
                        </option>
                      ))}
                    </>
                  ) : (
                    <option value="">No Approved Travel Requests Available</option>
                  )}
                </select>
              </div>
              <div className="field flex flex-col gap-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                  Claim Submission Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px]"
                  value={reimDate}
                  onChange={(e) => setReimDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {reimLink && dbRequests.some(r => r.reqId === reimLink && r.status === 'Approved') ? (
              <>
                <div className="section-label text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 mt-8">
                  Actual Travel Details
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="field flex flex-col gap-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Actual departure date</label>
                    <input
                      type="date"
                      className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px]"
                      value={actualDeparture}
                      onChange={(e) => setActualDeparture(e.target.value)}
                    />
                  </div>
                  <div className="field flex flex-col gap-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Actual return date</label>
                    <input
                      type="date"
                      className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px]"
                      value={actualReturn}
                      onChange={(e) => setActualReturn(e.target.value)}
                    />
                  </div>
                  <div className="field flex flex-col gap-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Mode of travel used</label>
                    <select
                      className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px] cursor-pointer"
                      value={actualTravelMode}
                      onChange={(e) => setActualTravelMode(e.target.value)}
                    >
                      <option>Flight</option>
                      <option>Train</option>
                      <option>Bus</option>
                      <option>Cab / Taxi</option>
                      <option>Owned vehicle</option>
                    </select>
                  </div>
                  <div className="field flex flex-col gap-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Distance (km)</label>
                    <input
                      type="number"
                      className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px] no-spinners"
                      value={actualDistance}
                      onWheel={(e) => e.target.blur()}
                      onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                      onChange={(e) => setActualDistance(e.target.value)}
                      placeholder="For fuel reimbursement"
                    />
                  </div>
                </div>

                <div className="section-label text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 mt-8">
                  Actual Expense Breakdown <span className="text-red-500">*</span>
                </div>
                <div className="table-wrap border-2 border-border rounded-2xl overflow-hidden bg-bg-card">
                  <div className="overflow-x-auto">
                    <table className="data-table w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-bg-input/20">
                          <th className="p-4 font-black text-text-muted uppercase tracking-wider text-[9px] w-[50%]">Expense Head</th>
                          <th className="p-4 font-black text-text-muted uppercase tracking-wider text-[9px] w-[30%]">Actual (₹)</th>
                          <th className="p-4 font-black text-text-muted uppercase tracking-wider text-[9px] text-center w-[20%]">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { key: 'fare', label: 'Travel fare' },
                          { key: 'hotel', label: 'Hotel / Accommodation' },
                          { key: 'meals', label: 'Meals (all)' },
                          { key: 'local', label: 'Local conveyance' },
                          { key: 'comm', label: 'Communication' },
                          { key: 'misc', label: 'Miscellaneous' }
                        ].map(row => {
                          const currentReq = dbRequests.find(r => r.reqId === reimLink);
                          const displayStatus = currentReq?.reimbursementStatus === 'Approved' ? 'Approved' : 'Pending';
                          return (
                            <tr key={row.key} className="border-b border-border hover:bg-bg-input/10">
                              <td className="p-4 font-bold text-text-primary">{row.label}</td>
                              <td className="p-4">
                                <input
                                  type="number"
                                  className="w-full text-right bg-bg-input border border-border rounded-lg px-2 py-1.5 text-xs font-bold text-text-primary focus:border-accent outline-none no-spinners"
                                  value={actualExpenses[row.key]}
                                  onWheel={(e) => e.target.blur()}
                                  onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                                  onChange={(e) => setActualExpenses({
                                    ...actualExpenses,
                                    [row.key]: Number(e.target.value) || 0
                                  })}
                                />
                              </td>
                              <td className="p-4 text-center">
                                {displayStatus === 'Approved' ? (
                                  <span className="status-badge badge-approved text-[8px] sm:text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-lg border border-emerald-500/20 select-none">
                                    Approved
                                  </span>
                                ) : (
                                  <span className="status-badge badge-pending text-[8px] sm:text-[9px] font-black bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-lg border border-orange-500/20 select-none">
                                    Pending
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  <div className="p-4 rounded-xl border border-border bg-bg-input/10 flex flex-col gap-1">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">Actual Claimed</span>
                    <span className="text-lg font-black text-text-primary font-black">
                      ₹ {calculateActualClaimed().toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col gap-1 font-black">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Net Payable to You</span>
                    <span className="text-lg font-black text-emerald-600">
                      ₹ {calculateNetPayable().toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="section-label text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 mt-8">
                  Advance Details
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="field flex flex-col gap-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Advance already received (₹)</label>
                    <input
                      type="number"
                      className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px] no-spinners"
                      value={actualAdvanceReceived}
                      onWheel={(e) => e.target.blur()}
                      onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                      onChange={(e) => setActualAdvanceReceived(Number(e.target.value) || '')}
                    />
                  </div>
                  <div className="field flex flex-col gap-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Advance payment reference</label>
                    <input
                      type="text"
                      className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px]"
                      value={actualAdvanceRef}
                      onChange={(e) => setActualAdvanceRef(e.target.value)}
                      placeholder="NEFT / UPI Ref."
                    />
                  </div>
                </div>

                <div className="section-label text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 mt-8">
                  Trip Outcome &amp; Remarks
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="field flex flex-col gap-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">
                      Trip outcome <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px] cursor-pointer"
                      value={tripOutcome}
                      onChange={(e) => setTripOutcome(e.target.value)}
                      required
                    >
                      <option>Meeting successful — follow-up scheduled</option>
                      <option>Deal closed</option>
                      <option>Presentation delivered</option>
                      <option>Site inspection completed</option>
                      <option>Training attended</option>
                      <option>No outcome — rescheduled</option>
                    </select>
                  </div>
                  <div className="field flex flex-col gap-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Next steps / follow-up</label>
                    <input
                      type="text"
                      className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px]"
                      value={outcomeNextSteps}
                      onChange={(e) => setOutcomeNextSteps(e.target.value)}
                      placeholder="E.g. Send proposal by 10 Jun"
                    />
                  </div>
                  <div className="field flex flex-col gap-2 md:col-span-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Employee remarks</label>
                    <textarea
                      className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all min-h-[85px] leading-relaxed"
                      value={employeeRemarks}
                      onChange={(e) => setEmployeeRemarks(e.target.value)}
                    />
                  </div>
                </div>

                <div className="section-label text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 mt-8">
                  Upload Bills &amp; Receipts <span className="text-red-500">*</span>
                </div>
                <input
                  type="file"
                  multiple
                  id="reimbursement-file-input"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      uploadFiles(Array.from(e.target.files), setReimbursementFiles);
                    }
                  }}
                />
                <div
                  className="doc-zone border-2 border-dashed border-border rounded-2xl p-6 text-center bg-bg-input/5 hover:bg-accent/5 hover:border-accent cursor-pointer transition-all flex flex-col items-center justify-center mb-4"
                  onClick={() => document.getElementById('reimbursement-file-input').click()}
                >
                  <Receipt size={30} className="text-text-muted mb-2" />
                  <p className="text-xs font-bold text-text-primary">
                    Upload all original bills — flight tickets, hotel invoice, meal receipts, toll receipts, cab bills
                  </p>
                  <p className="mt-1 text-[10px] font-black text-text-muted uppercase tracking-wider">PDF, JPG, PNG — max 10MB each</p>
                </div>
                {reimbursementFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {reimbursementFiles.map((file, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 bg-bg-input/40 border border-border px-3 py-1.5 rounded-full text-[10px] font-black text-text-secondary uppercase tracking-wider select-none">
                        {file.uploading ? (
                          <div className="w-3 h-3 border border-accent border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <FileCheck size={12} className="text-emerald-500" />
                        )}
                        {file.name}
                        {!file.uploading && file.url && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewFileUrl(file.url);
                              setPreviewFileName(file.name || 'Pre-Travel Document');
                            }}
                            className="ml-1.5 text-accent hover:underline lowercase tracking-normal font-bold"
                          >
                            View
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setReimbursementFiles(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="ml-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    type="button"
                    className="btn-secondary flex-1 py-4 text-xs font-black uppercase tracking-[0.2em] border-2 border-border rounded-2xl bg-bg-input/20 text-text-secondary hover:bg-bg-input transition-all cursor-pointer"
                    onClick={() => handleReimbursementSubmit(true)}
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    className="btn-primary flex-[2] py-4 text-xs font-black uppercase tracking-[0.2em] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer shadow-lg font-black"
                    onClick={() => handleReimbursementSubmit(false)}
                  >
                    Submit
                  </button>
                </div>
              </>
            ) : (
              <div className="p-8 border-2 border-dashed border-border rounded-3xl text-center bg-bg-input/5 mt-8 select-none">
                <Lock className="mx-auto text-text-muted mb-2 animate-bounce" size={32} />
                <p className="text-xs font-black text-text-primary uppercase tracking-wider">Reimbursement Locked</p>
                <p className="text-[10px] text-text-muted font-bold mt-1 max-w-sm mx-auto">
                  Please select an approved travel request from the dropdown above to unlock and fill the reimbursement form.
                </p>
              </div>
            )}

            {/* Submitted Reimbursements Details Section */}
            <div className="mt-8 pt-8 border-t border-border/60">
              <div className="text-sm font-black text-text-primary uppercase tracking-wider mb-4">
                Submitted Reimbursement Claims
              </div>
              {dbRequests.filter(req => req.reimbursementStatus && req.reimbursementStatus !== '').length > 0 ? (
                <div className="flex flex-col gap-4">
                  {dbRequests.filter(req => req.reimbursementStatus && req.reimbursementStatus !== '').map(req => {
                    const totalExpenses = Object.values(req.actualExpenses || {}).reduce((a, b) => a + Number(b || 0), 0);
                    const netPayable = totalExpenses - Number(req.actualAdvanceReceived || 0);

                    return (
                      <div key={req._id} className="border-2 border-border rounded-2xl p-5 bg-bg-input/5 hover:bg-bg-input/10 transition-all flex flex-col gap-4">
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-3">
                          <div>
                            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Travel Request ID</span>
                            <span className="font-bold text-text-primary text-xs">{req.reqId}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Destination</span>
                            <span className="font-bold text-text-primary text-xs">{req.destinationTo || '-'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Total Claimed</span>
                            <span className="font-bold text-text-primary text-xs">₹ {totalExpenses.toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Net Payable</span>
                            <span className="font-bold text-emerald-600 text-xs">₹ {netPayable.toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Status</span>
                            <span className={`status-badge text-[8px] sm:text-[9px] font-black px-2.5 py-0.5 rounded-lg border uppercase tracking-wider select-none ${req.reimbursementStatus === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                req.reimbursementStatus === 'Rejected' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                  'bg-orange-500/10 text-orange-500 border-orange-500/20'
                              }`}>
                              {req.reimbursementStatus}
                            </span>
                          </div>
                        </div>

                        {/* Breakdown */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                          {Object.entries(req.actualExpenses || {}).map(([key, val]) => (
                            <div key={key} className="bg-bg-card p-2 rounded-lg border border-border/60">
                              <span className="text-[8px] font-black text-text-muted uppercase tracking-wider block capitalize">{key === 'comm' ? 'Communication' : key === 'misc' ? 'Miscellaneous' : key}</span>
                              <span className="font-bold text-text-primary text-xs">₹ {val || 0}</span>
                            </div>
                          ))}
                        </div>

                        {/* More Details (Departure, Return, Remarks) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs mt-1">
                          <div>
                            <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Actual Travel Period</span>
                            <span className="font-bold text-text-secondary">{req.actualDeparture || '-'} to {req.actualReturn || '-'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Mode & Distance</span>
                            <span className="font-bold text-text-secondary">{req.actualTravelMode || '-'} ({req.actualDistance || '-'} km)</span>
                          </div>
                          {req.employeeRemarks && (
                            <div>
                              <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Remarks</span>
                              <span className="font-bold text-text-secondary block truncate" title={req.employeeRemarks}>{req.employeeRemarks}</span>
                            </div>
                          )}
                        </div>

                        {/* Bills/Receipts Files */}
                        {req.reimbursementBills && req.reimbursementBills.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block self-center mr-1">Receipts:</span>
                            {req.reimbursementBills.map((docStr, idx) => {
                              let name = 'Receipt';
                              let url = docStr;
                              if (docStr.includes('|')) {
                                const parts = docStr.split('|');
                                name = parts[0];
                                url = parts[1];
                              } else {
                                name = docStr.split('/').pop();
                              }
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setPreviewFileUrl(url);
                                    setPreviewFileName(name || 'Receipt/Bill');
                                  }}
                                  className="inline-flex items-center gap-1 bg-bg-card border border-border px-2.5 py-1 rounded-lg text-[9px] font-black text-accent hover:underline uppercase tracking-wider text-left"
                                >
                                  <FileCheck size={10} className="text-emerald-500" />
                                  {name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-text-muted font-bold bg-bg-input/5 border-2 border-dashed border-border rounded-2xl">
                  No submitted reimbursement claims found.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== TAB 3: ADMIN VIEW ===== */}
        {activeTab === 'admin' && isAdmin && (
          <div className="tab-panel p-4 sm:p-6 animate-zoom-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="text-sm font-black text-text-primary uppercase tracking-[0.15em]">
                Approvals Dashboard
              </div>
              <div className="flex gap-2 flex-wrap">
                <select
                  className="bg-bg-input border-2 border-border rounded-xl px-3 py-1.5 text-xs font-bold text-text-primary outline-none focus:border-accent transition-all cursor-pointer"
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                >
                  <option value="All Users">All Users</option>
                  {usersList.map(u => (
                    <option key={u.email} value={u.email}>
                      {u.fullName} ({u.role})
                    </option>
                  ))}
                </select>
                <select
                  className="bg-bg-input border-2 border-border rounded-xl px-3 py-1.5 text-xs font-bold text-text-primary outline-none focus:border-accent transition-all cursor-pointer"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option>All Types</option>
                  <option>Travel Requests</option>
                  <option>Reimbursements</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 select-none">
              <div
                onClick={() => handleStatusClick('Pending')}
                className={`p-4 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] ${statusFilter === 'Pending'
                  ? 'border-accent bg-accent/10 shadow-lg ring-1 ring-accent'
                  : 'border-border bg-bg-input/10 hover:border-text-muted'
                  }`}
              >
                <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">Pending this week</span>
                <span className="text-lg font-black text-text-primary font-black">
                  {adminCounts.pending}
                </span>
              </div>
              <div
                onClick={() => handleStatusClick('Approved')}
                className={`p-4 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] ${statusFilter === 'Approved'
                  ? 'border-emerald-500 bg-emerald-500/10 shadow-lg ring-1 ring-emerald-500'
                  : 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500'
                  }`}
              >
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Approved this month</span>
                <span className="text-lg font-black text-emerald-600">
                  {adminCounts.approved}
                </span>
              </div>
              <div
                onClick={() => handleStatusClick('Rejected')}
                className={`p-4 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] ${statusFilter === 'Rejected'
                  ? 'border-rose-500 bg-rose-500/10 shadow-lg ring-1 ring-rose-500'
                  : 'border-rose-500/30 bg-rose-500/5 hover:border-rose-500'
                  }`}
              >
                <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider">Rejected</span>
                <span className="text-lg font-black text-rose-600">
                  {adminCounts.rejected}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-10 text-xs font-black uppercase text-text-muted tracking-wider">
                Loading requests...
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredRequests.length > 0 ? (
                  filteredRequests
                    .map(req => (
                      <div
                        key={req._id}
                        className="p-5 border-2 border-border rounded-2xl bg-bg-input/10 hover:border-border/80 transition-all flex flex-col gap-4"
                        style={{ opacity: req.status !== 'Pending Review' && req.status !== 'Pending' ? 0.65 : 1 }}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <div className="text-[9px] font-black text-text-muted uppercase tracking-wider">
                              {req.reqId} &nbsp;·&nbsp; {req.reimbursementStatus && req.reimbursementStatus !== '' ? 'Reimbursement Claim' : 'Travel Request'}
                            </div>
                            <div className="text-sm font-black text-text-primary mt-1">
                              {req.requestedByName || 'Ravi Kumar'} — {req.destinationTo}
                            </div>
                            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wide mt-0.5">
                              Role: {req.department || 'Staff'}
                            </div>
                          </div>
                          <span className={`status-badge text-[8px] sm:text-[9px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${req.reimbursementStatus && req.reimbursementStatus !== ''
                            ? (req.reimbursementStatus === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                              req.reimbursementStatus === 'Rejected' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                req.reimbursementStatus === 'Submitted' || req.reimbursementStatus === 'Pending' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                  'bg-blue-500/10 text-blue border-blue-500/20')
                            : (req.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                              req.status === 'Rejected' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                req.status === 'Pending Review' || req.status === 'Pending' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                  'bg-blue-500/10 text-blue border-blue-500/20')
                            }`}>
                            {req.reimbursementStatus && req.reimbursementStatus !== ''
                              ? `Reimbursement: ${req.reimbursementStatus}`
                              : req.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-x-6 gap-y-2 py-3 border-t border-b border-border/40 select-none">
                          <div className="flex items-center gap-1.5 text-[10px] font-black text-text-muted uppercase tracking-wider">
                            <Clock size={13} /> {req.startDate} to {req.endDate}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-black text-text-muted uppercase tracking-wider">
                            <Plane size={13} /> {req.travellingBy || 'Flight'}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-black text-text-muted uppercase tracking-wider">
                            <Home size={13} /> {req.purpose}
                          </div>
                          <div className="ml-auto text-xs font-black text-text-primary flex items-center gap-3">
                            <span>₹ {req.totalTravelAmount}</span>
                            <button
                              type="button"
                              className="text-[10px] font-black uppercase text-accent border border-accent/30 bg-accent/5 px-2.5 py-1.5 rounded-lg hover:bg-accent hover:text-white transition-all flex items-center gap-1 select-none cursor-pointer"
                              onClick={() => toggleRequestExpand(req._id)}
                            >
                              {expandedRequests[req._id] ? 'Hide Details' : 'Details'}
                            </button>
                          </div>
                        </div>

                        {expandedRequests[req._id] && (
                          <div className="mt-2 p-4 border-2 border-border rounded-xl bg-bg-input/5 flex flex-col gap-4 text-xs text-text-secondary select-text">
                            {/* Travel request details */}
                            <div>
                              <div className="text-[10px] font-black text-text-primary uppercase tracking-wider mb-2 pb-1 border-b border-border/40">
                                Travel Request Details
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div>
                                  <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Departure City</span>
                                  <span className="font-bold text-text-primary">{req.destinationFrom || '-'}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Destination City</span>
                                  <span className="font-bold text-text-primary">{req.destinationTo || '-'}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Travel Mode</span>
                                  <span className="font-bold text-text-primary">{req.travellingBy || '-'}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Distance (km)</span>
                                  <span className="font-bold text-text-primary">{req.distanceKm || '-'}</span>
                                </div>
                                {req.hotelName && (
                                  <>
                                    <div>
                                      <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Hotel / Accommodation</span>
                                      <span className="font-bold text-text-primary">{req.hotelName}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Nights @ Rate</span>
                                      <span className="font-bold text-text-primary">{req.hotelNights} nights @ ₹{req.hotelRate}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Hotel Booking Ref</span>
                                      <span className="font-bold text-text-primary">{req.hotelBookingRef || '-'}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Estimated Fare</span>
                                      <span className="font-bold text-text-primary">₹ {req.estimatedFare || '0'}</span>
                                    </div>
                                  </>
                                )}
                                {req.mealDays > 0 && (
                                  <div>
                                    <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Meals Allowed</span>
                                    <span className="font-bold text-text-primary">{req.mealDays} days @ ₹{req.mealRate}/day</span>
                                  </div>
                                )}
                                {req.advanceRequested > 0 && (
                                  <>
                                    <div>
                                      <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Advance Requested</span>
                                      <span className="font-bold text-text-primary">₹ {req.advanceRequested}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Advance Mode</span>
                                      <span className="font-bold text-text-primary">{req.advanceMode || '-'}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                              {req.specialRemarks && (
                                <div className="mt-3">
                                  <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Special Remarks / Details</span>
                                  <p className="font-bold text-text-primary leading-relaxed mt-0.5">{req.specialRemarks}</p>
                                </div>
                              )}

                              {/* Estimated Expenses breakdown */}
                              <div className="mt-4 bg-bg-input/20 border border-border rounded-xl p-4 select-none">
                                <span className="text-[10px] font-black text-text-primary uppercase tracking-wider block mb-3 border-b border-border/30 pb-1">Estimated Expenses Breakdown</span>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                  <div className="bg-bg-card p-3 rounded-xl border border-border">
                                    <span className="text-[8px] font-black text-text-muted uppercase tracking-wider block">Estimated Fare</span>
                                    <span className="font-bold text-text-primary text-xs">₹ {req.estimatedFare || 0}</span>
                                  </div>
                                  <div className="bg-bg-card p-3 rounded-xl border border-border">
                                    <span className="text-[8px] font-black text-text-muted uppercase tracking-wider block">Hotel / Accommodation</span>
                                    <span className="font-bold text-text-primary text-xs">₹ {req.hotelExpense || 0}</span>
                                  </div>
                                  <div className="bg-bg-card p-3 rounded-xl border border-border">
                                    <span className="text-[8px] font-black text-text-muted uppercase tracking-wider block">Meal Allowance</span>
                                    <span className="font-bold text-text-primary text-xs">₹ {(req.mealDays || 0) * (req.mealRate || 0)}</span>
                                  </div>
                                  {req.otherExpenses && req.otherExpenses.length > 0 && req.otherExpenses.map((exp, idx) => (
                                    <div key={idx} className="bg-bg-card p-3 rounded-xl border border-border">
                                      <span className="text-[8px] font-black text-text-muted uppercase tracking-wider block capitalize">{exp.name}</span>
                                      <span className="font-bold text-text-primary text-xs">₹ {exp.amount || 0}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Reimbursement Details */}
                            {req.reimbursementStatus && (
                              <div className="border-2 border-emerald-500/20 rounded-xl p-4 bg-emerald-500/[0.02] mt-4 flex flex-col gap-4">
                                <div className="text-[10px] font-black text-emerald-600 uppercase tracking-wider pb-2 border-b border-emerald-500/10 flex items-center justify-between">
                                  <span className="flex items-center gap-1.5"><Receipt size={14} /> Reimbursement Claim Details</span>
                                  <span className="bg-emerald-500/15 text-emerald-600 px-2.5 py-0.5 rounded-lg border border-emerald-500/25 text-[8px] font-black uppercase tracking-wider">
                                    {req.reimbursementStatus}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                  <div>
                                    <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Actual Departure</span>
                                    <span className="font-bold text-text-primary text-xs">{req.actualDeparture || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Actual Return</span>
                                    <span className="font-bold text-text-primary text-xs">{req.actualReturn || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Actual Travel Mode</span>
                                    <span className="font-bold text-text-primary text-xs">{req.actualTravelMode || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Actual Distance (km)</span>
                                    <span className="font-bold text-text-primary text-xs">{req.actualDistance || '-'}</span>
                                  </div>
                                  {req.actualAdvanceReceived > 0 && (
                                    <>
                                      <div>
                                        <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Advance Received</span>
                                        <span className="font-bold text-text-primary text-xs">₹ {req.actualAdvanceReceived}</span>
                                      </div>
                                      <div>
                                        <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Advance Payment Ref</span>
                                        <span className="font-bold text-text-primary text-xs">{req.actualAdvanceRef || '-'}</span>
                                      </div>
                                    </>
                                  )}
                                </div>

                                <div className="bg-white border border-emerald-500/10 rounded-xl p-3">
                                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider block mb-2">Actual Expenses Breakdown</span>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                                    {Object.entries(req.actualExpenses || {}).map(([key, val]) => (
                                      <div key={key} className="bg-emerald-500/[0.02] p-2.5 rounded-lg border border-emerald-500/10">
                                        <span className="text-[8px] font-black text-text-muted uppercase tracking-wider block capitalize">{key === 'comm' ? 'Communication' : key === 'misc' ? 'Miscellaneous' : key}</span>
                                        <span className="font-bold text-text-primary text-xs">₹ {val || 0}</span>
                                        {req.actualBillNos?.[key] && (
                                          <span className="text-[8px] text-text-muted block mt-0.5 truncate" title={req.actualBillNos[key]}>Bill: {req.actualBillNos[key]}</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {req.tripOutcome && (
                                    <div>
                                      <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Trip Outcome</span>
                                      <span className="font-bold text-text-primary block mt-0.5 text-xs">{req.tripOutcome}</span>
                                    </div>
                                  )}
                                  {req.outcomeNextSteps && (
                                    <div>
                                      <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Next Steps / Follow-up</span>
                                      <span className="font-bold text-text-primary block mt-0.5 text-xs">{req.outcomeNextSteps}</span>
                                    </div>
                                  )}
                                </div>
                                {req.employeeRemarks && (
                                  <div>
                                    <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Employee Remarks</span>
                                    <p className="font-bold text-text-primary leading-relaxed mt-0.5 text-xs">{req.employeeRemarks}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {(req.status === 'Pending Review' || req.status === 'Pending') && (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  className="flex-1 py-2 text-[10px] font-black uppercase tracking-wider border-2 border-emerald-500 text-emerald-500 bg-emerald-500/5 rounded-xl cursor-pointer hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-1 font-black"
                                  onClick={() => handleAdminAction(req._id, 'approved')}
                                >
                                  <Check size={12} /> Approve Request
                                </button>
                                <button
                                  type="button"
                                  className="flex-1 py-2 text-[10px] font-black uppercase tracking-wider border-2 border-rose-500 text-rose-500 bg-rose-500/5 rounded-xl cursor-pointer hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-1 font-black"
                                  onClick={() => handleAdminAction(req._id, 'rejected')}
                                >
                                  <X size={12} /> Reject Request
                                </button>
                                {/* <button
                                  type="button"
                                  className="flex-1 py-2 text-[10px] font-black uppercase tracking-wider border-2 border-border text-text-secondary bg-bg-input/20 rounded-xl cursor-pointer hover:bg-bg-input transition-all flex items-center justify-center gap-1"
                                  onClick={() => triggerToast(`Query sent to user for ${req.reqId}`)}
                                >
                                  <MessageSquare size={12} /> Query
                                </button> */}
                              </div>
                            )}

                            {(req.reimbursementStatus === 'Submitted' || req.reimbursementStatus === 'Pending') && (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  className="flex-1 py-2 text-[10px] font-black uppercase tracking-wider border-2 border-emerald-500 text-emerald-500 bg-emerald-500/5 rounded-xl cursor-pointer hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-1 font-black"
                                  onClick={() => handleAdminReimbursementAction(req.reqId, 'approved')}
                                >
                                  <Check size={12} /> Approve Reimbursement
                                </button>
                                <button
                                  type="button"
                                  className="flex-1 py-2 text-[10px] font-black uppercase tracking-wider border-2 border-rose-500 text-rose-500 bg-rose-500/5 rounded-xl cursor-pointer hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-1 font-black"
                                  onClick={() => handleAdminReimbursementAction(req.reqId, 'rejected')}
                                >
                                  <X size={12} /> Reject Reimbursement
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                ) : (
                  <div className="text-center py-10 text-xs font-black uppercase text-text-muted tracking-wider">
                    No requests found matching the active filters.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== TAB 4: POLICY ===== */}
        {activeTab === 'policy' && (
          <div className="tab-panel p-4 sm:p-6 animate-zoom-in">
            <div className="text-sm font-black text-text-primary uppercase tracking-[0.15em]">
              Company Travel Policy
            </div>
            <div className="section-label text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 mt-8">
              Key Rules &amp; Guidelines
            </div>
            <div className="flex flex-col border border-border rounded-2xl overflow-hidden bg-bg-input/5">
              {[
                { icon: Clock, title: 'Advance request timeline', desc: 'Travel requests must be submitted minimum 3 working days before departure. Advance up to 80% of estimated cost will be released 2 days before travel.' },
                { icon: Receipt, title: 'Reimbursement deadline', desc: 'All claims with original bills must be submitted within 7 calendar days of return. Late claims require HOD approval and may be declined.' },
                { icon: Car, title: 'Own vehicle reimbursement', desc: 'Reimbursed at ₹10/km. Fuel receipts not required; odometer reading is mandatory.' },
                { icon: Home, title: 'Accommodation', desc: 'Hotel stays must be in approved hotels or guest houses. Personal accommodation with relatives is reimbursed at 50% of the applicable hotel limit.' },
                { icon: Wrench, title: 'Miscellaneous limit', desc: 'Capped at ₹500 (L3), ₹800 (L2), ₹1,500 (L1) per trip. Receipts required for any single expense above ₹100.' },
                { icon: X, title: 'Non-reimbursable items', desc: 'Personal entertainment, alcohol, minibar, laundry (trips under 3 nights), personal phone calls, fines / penalties, and costs due to personal negligence are not reimbursable.' },
                { icon: AlertCircle, title: 'Excess claims', desc: 'Expenses exceeding sanctioned limits require prior written approval from the department head. Unapproved excess is the employee\'s personal liability.' },
                { icon: Globe, title: 'International travel', desc: 'Requires CEO / MD approval in addition to department head sign-off. Foreign exchange, travel insurance, and visa fees are reimbursable with receipts.' }
              ].map((item, idx) => {
                const IconComp = item.icon;
                return (
                  <div key={idx} className="flex gap-4 items-start p-4 border-b border-border last:border-b-0 hover:bg-bg-input/10 transition-all">
                    <div className="p-2 bg-blue-soft rounded-lg text-blue shrink-0">
                      <IconComp size={15} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-text-primary uppercase tracking-wide mb-1">
                        {item.title}
                      </h4>
                      <p className="text-xs text-text-muted font-medium leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <FilePreviewModal
        isOpen={!!previewFileUrl}
        onClose={() => setPreviewFileUrl(null)}
        fileUrl={previewFileUrl}
        fileName={previewFileName}
      />
    </div>
  );
}