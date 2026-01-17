// Campus Navigator Service - Office and Department Directory
// Manages campus locations, office hours, and contact information

export class CampusService {
  // Sample campus data - You can expand this with your actual campus information
  static campusData = {
    offices: [
      // Academic Offices
      {
        id: 'registrar',
        name: 'Registrar Office',
        department: 'Academic Records',
        category: 'academic',
        building: 'Main Building',
        room: '101',
        phone: '+63 (082) 221-4028',
        email: 'registrar@cjc.edu.ph',
        coordinates: { latitude: 6.9952, longitude: 125.2521 },
        hours: {
          Monday: '08:00 - 17:00',
          Tuesday: '08:00 - 17:00',
          Wednesday: '08:00 - 17:00',
          Thursday: '08:00 - 17:00',
          Friday: '08:00 - 17:00',
          Saturday: 'Closed',
          Sunday: 'Closed'
        }
      },
      {
        id: 'dean-cas',
        name: "Dean's Office - CAS",
        department: 'College of Arts & Sciences',
        category: 'academic',
        building: 'CAS Building',
        room: '201',
        phone: '+63 (082) 221-4029',
        email: 'dean.cas@cjc.edu.ph',
        coordinates: { latitude: 6.9953, longitude: 125.2522 },
        hours: {
          Monday: '08:00 - 17:00',
          Tuesday: '08:00 - 17:00',
          Wednesday: '08:00 - 17:00',
          Thursday: '08:00 - 17:00',
          Friday: '08:00 - 17:00',
          Saturday: 'Closed',
          Sunday: 'Closed'
        }
      },
      {
        id: 'library',
        name: 'Learning Resource Center',
        department: 'Library Services',
        category: 'academic',
        building: 'Library Building',
        room: 'Ground Floor',
        phone: '+63 (082) 221-4030',
        email: 'library@cjc.edu.ph',
        coordinates: { latitude: 6.9954, longitude: 125.2523 },
        hours: {
          Monday: '07:30 - 20:00',
          Tuesday: '07:30 - 20:00',
          Wednesday: '07:30 - 20:00',
          Thursday: '07:30 - 20:00',
          Friday: '07:30 - 20:00',
          Saturday: '08:00 - 17:00',
          Sunday: 'Closed'
        }
      },

      // Administrative Offices
      {
        id: 'president',
        name: "President's Office",
        department: 'Office of the President',
        category: 'administrative',
        building: 'Administration',
        room: '301',
        phone: '+63 (082) 221-4000',
        email: 'president@cjc.edu.ph',
        coordinates: { latitude: 6.9951, longitude: 125.2520 },
        hours: {
          Monday: '08:00 - 17:00',
          Tuesday: '08:00 - 17:00',
          Wednesday: '08:00 - 17:00',
          Thursday: '08:00 - 17:00',
          Friday: '08:00 - 17:00',
          Saturday: 'Closed',
          Sunday: 'Closed'
        }
      },
      {
        id: 'hr',
        name: 'Human Resources',
        department: 'HR Department',
        category: 'administrative',
        building: 'Administration',
        room: '205',
        phone: '+63 (082) 221-4031',
        email: 'hr@cjc.edu.ph',
        coordinates: { latitude: 6.9951, longitude: 125.2520 },
        hours: {
          Monday: '08:00 - 17:00',
          Tuesday: '08:00 - 17:00',
          Wednesday: '08:00 - 17:00',
          Thursday: '08:00 - 17:00',
          Friday: '08:00 - 17:00',
          Saturday: 'Closed',
          Sunday: 'Closed'
        }
      },
      {
        id: 'accounting',
        name: 'Accounting Office',
        department: 'Finance & Accounting',
        category: 'administrative',
        building: 'Administration',
        room: '102',
        phone: '+63 (082) 221-4032',
        email: 'accounting@cjc.edu.ph',
        coordinates: { latitude: 6.9951, longitude: 125.2520 },
        hours: {
          Monday: '08:00 - 17:00',
          Tuesday: '08:00 - 17:00',
          Wednesday: '08:00 - 17:00',
          Thursday: '08:00 - 17:00',
          Friday: '08:00 - 17:00',
          Saturday: 'Closed',
          Sunday: 'Closed'
        }
      },

      // Student Services
      {
        id: 'osa',
        name: 'Office of Student Affairs',
        department: 'Student Services',
        category: 'student_services',
        building: 'Student Center',
        room: '101',
        phone: '+63 (082) 221-4033',
        email: 'osa@cjc.edu.ph',
        coordinates: { latitude: 6.9955, longitude: 125.2524 },
        hours: {
          Monday: '08:00 - 17:00',
          Tuesday: '08:00 - 17:00',
          Wednesday: '08:00 - 17:00',
          Thursday: '08:00 - 17:00',
          Friday: '08:00 - 17:00',
          Saturday: 'Closed',
          Sunday: 'Closed'
        }
      },
      {
        id: 'guidance',
        name: 'Guidance & Counseling',
        department: 'Student Wellness',
        category: 'student_services',
        building: 'Student Center',
        room: '103',
        phone: '+63 (082) 221-4034',
        email: 'guidance@cjc.edu.ph',
        coordinates: { latitude: 6.9955, longitude: 125.2524 },
        hours: {
          Monday: '08:00 - 17:00',
          Tuesday: '08:00 - 17:00',
          Wednesday: '08:00 - 17:00',
          Thursday: '08:00 - 17:00',
          Friday: '08:00 - 17:00',
          Saturday: 'Closed',
          Sunday: 'Closed'
        }
      },
      {
        id: 'scholarship',
        name: 'Scholarship Office',
        department: 'Financial Aid',
        category: 'student_services',
        building: 'Administration',
        room: '103',
        phone: '+63 (082) 221-4035',
        email: 'scholarship@cjc.edu.ph',
        coordinates: { latitude: 6.9951, longitude: 125.2520 },
        hours: {
          Monday: '08:00 - 17:00',
          Tuesday: '08:00 - 17:00',
          Wednesday: '08:00 - 17:00',
          Thursday: '08:00 - 17:00',
          Friday: '08:00 - 17:00',
          Saturday: 'Closed',
          Sunday: 'Closed'
        }
      },
      {
        id: 'clinic',
        name: 'Medical Clinic',
        department: 'Health Services',
        category: 'student_services',
        building: 'Student Center',
        room: '105',
        phone: '+63 (082) 221-4036',
        email: 'clinic@cjc.edu.ph',
        coordinates: { latitude: 6.9955, longitude: 125.2524 },
        hours: {
          Monday: '08:00 - 17:00',
          Tuesday: '08:00 - 17:00',
          Wednesday: '08:00 - 17:00',
          Thursday: '08:00 - 17:00',
          Friday: '08:00 - 17:00',
          Saturday: '08:00 - 12:00',
          Sunday: 'Closed'
        }
      },

      // Facilities & IT
      {
        id: 'it',
        name: 'IT Services',
        department: 'Information Technology',
        category: 'facilities',
        building: 'IT Building',
        room: '201',
        phone: '+63 (082) 221-4037',
        email: 'itservices@cjc.edu.ph',
        coordinates: { latitude: 6.9956, longitude: 125.2525 },
        hours: {
          Monday: '07:30 - 18:00',
          Tuesday: '07:30 - 18:00',
          Wednesday: '07:30 - 18:00',
          Thursday: '07:30 - 18:00',
          Friday: '07:30 - 18:00',
          Saturday: '08:00 - 12:00',
          Sunday: 'Closed'
        }
      },
      {
        id: 'security',
        name: 'Security Office',
        department: 'Campus Security',
        category: 'facilities',
        building: 'Main Gate',
        room: 'Ground Floor',
        phone: '+63 (082) 221-4038',
        email: 'security@cjc.edu.ph',
        coordinates: { latitude: 6.9950, longitude: 125.2519 },
        hours: {
          Monday: '24 Hours',
          Tuesday: '24 Hours',
          Wednesday: '24 Hours',
          Thursday: '24 Hours',
          Friday: '24 Hours',
          Saturday: '24 Hours',
          Sunday: '24 Hours'
        }
      },
      {
        id: 'maintenance',
        name: 'Maintenance Office',
        department: 'Facilities Management',
        category: 'facilities',
        building: 'Maintenance Building',
        room: '101',
        phone: '+63 (082) 221-4039',
        email: 'maintenance@cjc.edu.ph',
        coordinates: { latitude: 6.9957, longitude: 125.2526 },
        hours: {
          Monday: '07:00 - 17:00',
          Tuesday: '07:00 - 17:00',
          Wednesday: '07:00 - 17:00',
          Thursday: '07:00 - 17:00',
          Friday: '07:00 - 17:00',
          Saturday: '08:00 - 12:00',
          Sunday: 'Closed'
        }
      },

      // Additional Services
      {
        id: 'cashier',
        name: 'Cashier Office',
        department: 'Treasury',
        category: 'administrative',
        building: 'Administration',
        room: '104',
        phone: '+63 (082) 221-4040',
        email: 'cashier@cjc.edu.ph',
        coordinates: { latitude: 6.9951, longitude: 125.2520 },
        hours: {
          Monday: '08:00 - 17:00',
          Tuesday: '08:00 - 17:00',
          Wednesday: '08:00 - 17:00',
          Thursday: '08:00 - 17:00',
          Friday: '08:00 - 17:00',
          Saturday: 'Closed',
          Sunday: 'Closed'
        }
      },
      {
        id: 'cafeteria',
        name: 'Cafeteria',
        department: 'Food Services',
        category: 'facilities',
        building: 'Student Center',
        room: 'Ground Floor',
        phone: '+63 (082) 221-4041',
        email: null,
        coordinates: { latitude: 6.9955, longitude: 125.2524 },
        hours: {
          Monday: '07:00 - 18:00',
          Tuesday: '07:00 - 18:00',
          Wednesday: '07:00 - 18:00',
          Thursday: '07:00 - 18:00',
          Friday: '07:00 - 18:00',
          Saturday: '08:00 - 15:00',
          Sunday: 'Closed'
        }
      },
      {
        id: 'bookstore',
        name: 'Campus Bookstore',
        department: 'Supplies & Materials',
        category: 'facilities',
        building: 'Main Building',
        room: 'Ground Floor',
        phone: '+63 (082) 221-4042',
        email: null,
        coordinates: { latitude: 6.9952, longitude: 125.2521 },
        hours: {
          Monday: '08:00 - 17:00',
          Tuesday: '08:00 - 17:00',
          Wednesday: '08:00 - 17:00',
          Thursday: '08:00 - 17:00',
          Friday: '08:00 - 17:00',
          Saturday: '08:00 - 12:00',
          Sunday: 'Closed'
        }
      }
    ]
  };

  // Get all offices
  static getAllOffices() {
    return this.campusData.offices;
  }

  // Get office by ID
  static getOfficeById(id) {
    return this.campusData.offices.find(office => office.id === id);
  }

  // Get offices by category
  static getOfficesByCategory(category) {
    if (category === 'all') return this.getAllOffices();
    return this.campusData.offices.filter(office => office.category === category);
  }

  // Get offices by building
  static getOfficesByBuilding(building) {
    if (building === 'all') return this.getAllOffices();
    return this.campusData.offices.filter(office => office.building === building);
  }

  // Get unique buildings
  static getBuildings() {
    const buildings = [...new Set(this.campusData.offices.map(office => office.building))];
    return buildings.sort();
  }

  // Get unique departments
  static getDepartments() {
    const departments = [...new Set(this.campusData.offices.map(office => office.department))];
    return departments.sort();
  }

  // Search offices
  static searchOffices(query) {
    const lowerQuery = query.toLowerCase();
    return this.campusData.offices.filter(office =>
      office.name.toLowerCase().includes(lowerQuery) ||
      office.department.toLowerCase().includes(lowerQuery) ||
      office.building.toLowerCase().includes(lowerQuery) ||
      (office.room && office.room.toLowerCase().includes(lowerQuery))
    );
  }

  // Check if office is currently open
  static isOfficeOpen(officeId) {
    const office = this.getOfficeById(officeId);
    if (!office || !office.hours) return false;

    const now = new Date();
    const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const todayHours = office.hours[currentDay];
    if (!todayHours || todayHours === 'Closed' || todayHours === '24 Hours') {
      return todayHours === '24 Hours';
    }

    const [start, end] = todayHours.split(' - ');
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    return currentTime >= startTime && currentTime <= endTime;
  }

  // Get office hours for today
  static getTodayHours(officeId) {
    const office = this.getOfficeById(officeId);
    if (!office || !office.hours) return null;

    const now = new Date();
    const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
    return office.hours[currentDay];
  }

  // Add custom office (for admin use)
  static addOffice(officeData) {
    const newOffice = {
      id: Date.now().toString(),
      ...officeData
    };
    this.campusData.offices.push(newOffice);
    return newOffice;
  }

  // Update office
  static updateOffice(id, updates) {
    const index = this.campusData.offices.findIndex(office => office.id === id);
    if (index !== -1) {
      this.campusData.offices[index] = {
        ...this.campusData.offices[index],
        ...updates
      };
      return this.campusData.offices[index];
    }
    return null;
  }

  // Delete office
  static deleteOffice(id) {
    const index = this.campusData.offices.findIndex(office => office.id === id);
    if (index !== -1) {
      this.campusData.offices.splice(index, 1);
      return true;
    }
    return false;
  }
}
