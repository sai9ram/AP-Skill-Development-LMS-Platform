import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding AP Skill Development LMS database...");

  // Clear existing data in dependency order
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.batchEnrollment.deleteMany();
  await prisma.batchTrainer.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.institutionCourse.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();
  await prisma.trainer.deleteMany();
  await prisma.course.deleteMany();
  await prisma.institution.deleteMany();
  await prisma.university.deleteMany();
  await prisma.systemConfig.deleteMany();

  // 1. Universities
  const universities = await Promise.all([
    prisma.university.create({
      data: {
        name: "Jawaharlal Nehru Technological University Kakinada",
        code: "JNTUK",
        district: "Kakinada",
      },
    }),
    prisma.university.create({
      data: {
        name: "Jawaharlal Nehru Technological University Anantapur",
        code: "JNTUA",
        district: "Anantapur",
      },
    }),
    prisma.university.create({
      data: {
        name: "Andhra University",
        code: "AU",
        district: "Visakhapatnam",
      },
    }),
    prisma.university.create({
      data: {
        name: "Sri Venkateswara University",
        code: "SVU",
        district: "Tirupati",
      },
    }),
    prisma.university.create({
      data: {
        name: "Acharya Nagarjuna University",
        code: "ANU",
        district: "Guntur",
      },
    }),
  ]);

  const [jntuk, jntua, au, svu, anu] = universities;

  // 2. Institutions
  const institutions = await Promise.all([
    prisma.institution.create({
      data: {
        name: "Gayatri Vidya Parishad College of Engineering",
        code: "AP-VSP-001",
        universityId: au.id,
        district: "Visakhapatnam",
        city: "Madhurawada",
        address: "Kommadi, Madhurawada, Visakhapatnam - 530048",
        principalName: "Dr. A. B. Koteswara Rao",
        contactEmail: "principal@gvpce.ac.in",
        contactMobile: "0891-2739507",
      },
    }),
    prisma.institution.create({
      data: {
        name: "V.R. Siddhartha Engineering College",
        code: "AP-NTR-002",
        universityId: jntuk.id,
        district: "NTR (Vijayawada)",
        city: "Vijayawada",
        address: "Kanuru, Vijayawada - 520007",
        principalName: "Dr. A. V. Ratna Prasad",
        contactEmail: "principal@vrsiddhartha.ac.in",
        contactMobile: "0866-2582333",
      },
    }),
    prisma.institution.create({
      data: {
        name: "Sri Venkateswara University College of Engineering",
        code: "AP-TPT-003",
        universityId: svu.id,
        district: "Tirupati",
        city: "Tirupati",
        address: "SVU Campus, Tirupati - 517502",
        principalName: "Dr. P. Mallikarjuna Rao",
        contactEmail: "principal@svuce.edu.in",
        contactMobile: "0877-2289561",
      },
    }),
    prisma.institution.create({
      data: {
        name: "RVR & JC College of Engineering",
        code: "AP-GNT-004",
        universityId: anu.id,
        district: "Guntur",
        city: "Chowdavaram",
        address: "Chandramoulipuram, Chowdavaram, Guntur - 522019",
        principalName: "Dr. K. Ravindra",
        contactEmail: "principal@rvrjc.ac.in",
        contactMobile: "0863-2288201",
      },
    }),
    prisma.institution.create({
      data: {
        name: "JNTUK University College of Engineering",
        code: "AP-KKD-005",
        universityId: jntuk.id,
        district: "Kakinada",
        city: "Kakinada",
        address: "Nagammavari Thota, Kakinada - 533003",
        principalName: "Dr. M. H. M. Krishna Prasad",
        contactEmail: "principal@jntucek.ac.in",
        contactMobile: "0884-2300900",
      },
    }),
    prisma.institution.create({
      data: {
        name: "JNTUA College of Engineering Anantapur",
        code: "AP-ATP-006",
        universityId: jntua.id,
        district: "Anantapur",
        city: "Anantapur",
        address: "Sir Mokshagundam Vishveshwariah Road, Anantapur - 515002",
        principalName: "Dr. S. V. Satyanarayana",
        contactEmail: "principal@jntuacea.ac.in",
        contactMobile: "08554-273013",
      },
    }),
    prisma.institution.create({
      data: {
        name: "G. Pulla Reddy Engineering College",
        code: "AP-KNL-007",
        universityId: jntua.id,
        district: "Kurnool",
        city: "Kurnool",
        address: "Nandyal Road, Kurnool - 518007",
        principalName: "Dr. B. Sreenivasa Reddy",
        contactEmail: "principal@gprec.ac.in",
        contactMobile: "08518-270957",
      },
    }),
    prisma.institution.create({
      data: {
        name: "NBKR Institute of Science & Technology",
        code: "AP-NLR-008",
        universityId: svu.id,
        district: "Nellore",
        city: "Vidyanagar",
        address: "Vidyanagar, Kota Mandal, Nellore - 524413",
        principalName: "Dr. V. Vijaya Kumar Reddy",
        contactEmail: "director@nbkrist.org",
        contactMobile: "08624-228247",
      },
    }),
  ]);

  const [gvp, vrsec, svuce, rvrjc, jntucek, jntuacea] = institutions;

  // 3. Users (Super Admin + College Admins)
  const superAdminHash = await bcrypt.hash("Admin@AP2026", 10);
  const collegeAdminHash = await bcrypt.hash("College@2026", 10);
  const tempAdminHash = await bcrypt.hash("TempPass@2026", 10);

  const superAdmin = await prisma.user.create({
    data: {
      username: "SA-APSSDC-001",
      fullName: "Sri Rajeshwar Rao, IAS",
      email: "superadmin@apssdc.ap.gov.in",
      passwordHash: superAdminHash,
      role: "SUPER_ADMIN",
      designation: "State Program Director",
      phone: "0863-2340001",
      mustChangePassword: false,
    },
  });

  const gvpAdmin = await prisma.user.create({
    data: {
      username: "ADM-AP-VSP-001",
      fullName: "Prof. K. Srinivasulu",
      email: "admin.gvpce@apssdc.ap.gov.in",
      passwordHash: collegeAdminHash,
      role: "COLLEGE_ADMIN",
      institutionId: gvp.id,
      designation: "Skill Nodal Officer",
      phone: "9848011223",
      mustChangePassword: false,
    },
  });

  const vrsecAdmin = await prisma.user.create({
    data: {
      username: "ADM-AP-NTR-002",
      fullName: "Dr. M. Padmavathi",
      email: "admin.vrsec@apssdc.ap.gov.in",
      passwordHash: collegeAdminHash,
      role: "COLLEGE_ADMIN",
      institutionId: vrsec.id,
      designation: "Training & Placement Coordinator",
      phone: "9848022334",
      mustChangePassword: false,
    },
  });

  const svuceAdmin = await prisma.user.create({
    data: {
      username: "ADM-AP-TPT-003",
      fullName: "Dr. T. Narasimha Reddy",
      email: "admin.svuce@apssdc.ap.gov.in",
      passwordHash: tempAdminHash,
      role: "COLLEGE_ADMIN",
      institutionId: svuce.id,
      designation: "College Skill Coordinator",
      phone: "9848033445",
      mustChangePassword: true,
    },
  });

  // 4. Courses
  const courses = await Promise.all([
    prisma.course.create({
      data: {
        code: "APSD-AI-101",
        title: "Applied AI & Cloud Engineering",
        sector: "IT & Cloud",
        durationHours: 160,
        level: "INTERMEDIATE",
        description:
          "Hands-on enterprise AI, Python ML pipelines, and cloud deployment.",
      },
    }),
    prisma.course.create({
      data: {
        code: "APSD-FS-102",
        title: "Full Stack Web Development (Next.js & PostgreSQL)",
        sector: "Software Engineering",
        durationHours: 200,
        level: "INTERMEDIATE",
        description:
          "Production-grade TypeScript, React, REST APIs, and relational databases.",
      },
    }),
    prisma.course.create({
      data: {
        code: "APSD-IOT-103",
        title: "Embedded Systems & Industrial IoT",
        sector: "Electronics & Hardware",
        durationHours: 140,
        level: "FOUNDATION",
        description:
          "ARM Cortex microcontrollers, MQTT telemetry, and sensor interfacing.",
      },
    }),
    prisma.course.create({
      data: {
        code: "APSD-EV-104",
        title: "Electric Vehicle Powertrain & BMS",
        sector: "Automotive & EV",
        durationHours: 180,
        level: "ADVANCED",
        description:
          "EV traction motors, battery management systems, and thermal design.",
      },
    }),
    prisma.course.create({
      data: {
        code: "APSD-DA-105",
        title: "Enterprise Data Analytics & BI",
        sector: "Data Science",
        durationHours: 120,
        level: "FOUNDATION",
        description:
          "SQL warehousing, Python data modeling, and governance dashboards.",
      },
    }),
    prisma.course.create({
      data: {
        code: "APSD-CS-106",
        title: "Cyber Security & SOC Operations",
        sector: "Cyber Security",
        durationHours: 160,
        level: "ADVANCED",
        description:
          "Network defense, SIEM monitoring, and vulnerability assessment.",
      },
    }),
  ]);

  const [cAI, cFS, cIOT, cEV, cDA, cCS] = courses;

  // 5. Trainers
  const trainers = await Promise.all([
    prisma.trainer.create({
      data: {
        trainerCode: "TRN-AP-001",
        fullName: "Karthikeya Varma",
        email: "karthikeya.varma@apssdc.ap.gov.in",
        phone: "9908112201",
        specialization: "Applied AI & Cloud",
        qualification: "M.Tech (CSE), AWS Certified Solutions Architect",
      },
    }),
    prisma.trainer.create({
      data: {
        trainerCode: "TRN-AP-002",
        fullName: "Sneha Latha Devi",
        email: "sneha.devi@apssdc.ap.gov.in",
        phone: "9908112202",
        specialization: "Full Stack Engineering",
        qualification: "M.Tech (IT), 8 yrs Enterprise Architecture",
      },
    }),
    prisma.trainer.create({
      data: {
        trainerCode: "TRN-AP-003",
        fullName: "Praveen Kumar Goud",
        email: "praveen.goud@apssdc.ap.gov.in",
        phone: "9908112203",
        specialization: "Embedded & IoT",
        qualification: "M.E. (Embedded Systems)",
      },
    }),
    prisma.trainer.create({
      data: {
        trainerCode: "TRN-AP-004",
        fullName: "Anusha Chowdary",
        email: "anusha.c@apssdc.ap.gov.in",
        phone: "9908112204",
        specialization: "Data Analytics & BI",
        qualification: "M.Sc (Data Science)",
      },
    }),
    prisma.trainer.create({
      data: {
        trainerCode: "TRN-AP-005",
        fullName: "Suresh Babu Naidu",
        email: "suresh.naidu@apssdc.ap.gov.in",
        phone: "9908112205",
        specialization: "Electric Vehicle Systems",
        qualification: "M.Tech (Power Electronics)",
      },
    }),
  ]);

  const [t1, t2, t3, t4, t5] = trainers;

  // 6. Institution Course Assignments
  const icPairs = [
    [gvp.id, cAI.id],
    [gvp.id, cFS.id],
    [gvp.id, cCS.id],
    [vrsec.id, cAI.id],
    [vrsec.id, cIOT.id],
    [vrsec.id, cDA.id],
    [svuce.id, cEV.id],
    [svuce.id, cAI.id],
    [rvrjc.id, cFS.id],
    [jntucek.id, cAI.id],
    [jntuacea.id, cEV.id],
  ];
  for (const [institutionId, courseId] of icPairs) {
    await prisma.institutionCourse.create({ data: { institutionId, courseId } });
  }

  // 7. Batches
  const batchGvpAi = await prisma.batch.create({
    data: {
      batchCode: "BAT-AU-VSP001-2026-00001",
      name: "GVPCE AI & Cloud Cohort A",
      institutionId: gvp.id,
      courseId: cAI.id,
      trainerId: t1.id,
      startDate: "2026-09-01",
      endDate: "2026-12-20",
      status: "ACTIVE",
      trainingMode: "Offline",
      location: "GVPCE Central Skill Lab 1",
      maxCapacity: 60,
    },
  });

  const batchGvpFs = await prisma.batch.create({
    data: {
      batchCode: "BAT-AU-VSP001-2026-00002",
      name: "GVPCE Full Stack Cohort B",
      institutionId: gvp.id,
      courseId: cFS.id,
      trainerId: t2.id,
      startDate: "2026-09-15",
      endDate: "2027-01-15",
      status: "ACTIVE",
      trainingMode: "Hybrid",
      location: "GVPCE Innovation Center",
      maxCapacity: 50,
    },
  });

  const batchVrsecIot = await prisma.batch.create({
    data: {
      batchCode: "BAT-JNTUK-NTR002-2026-00003",
      name: "VRSEC Industrial IoT Batch 1",
      institutionId: vrsec.id,
      courseId: cIOT.id,
      trainerId: t3.id,
      startDate: "2026-08-20",
      endDate: "2026-12-10",
      status: "ACTIVE",
      trainingMode: "Offline",
      location: "VRSEC Embedded Systems Lab",
      maxCapacity: 45,
    },
  });

  const batchVrsecDa = await prisma.batch.create({
    data: {
      batchCode: "BAT-JNTUK-NTR002-2026-00004",
      name: "VRSEC Data Analytics Batch 2",
      institutionId: vrsec.id,
      courseId: cDA.id,
      trainerId: t4.id,
      startDate: "2026-10-01",
      endDate: "2027-01-10",
      status: "PLANNED",
      trainingMode: "Online",
      location: "Virtual Classroom B",
      maxCapacity: 60,
    },
  });

  const batchSvuceEv = await prisma.batch.create({
    data: {
      batchCode: "BAT-SVU-TPT003-2026-00005",
      name: "SVUCE EV Powertrain Cohort",
      institutionId: svuce.id,
      courseId: cEV.id,
      trainerId: t5.id,
      startDate: "2026-09-05",
      endDate: "2026-12-25",
      status: "ACTIVE",
      trainingMode: "Offline",
      location: "SVUCE EV Powertrain Workshop",
      maxCapacity: 40,
    },
  });

  await prisma.batchTrainer.createMany({
    data: [
      { batchId: batchGvpAi.id, trainerId: t1.id, role: "LEAD_TRAINER", status: "ACTIVE" },
      { batchId: batchGvpFs.id, trainerId: t2.id, role: "LEAD_TRAINER", status: "ACTIVE" },
      { batchId: batchVrsecIot.id, trainerId: t3.id, role: "LEAD_TRAINER", status: "ACTIVE" },
      { batchId: batchVrsecDa.id, trainerId: t4.id, role: "LEAD_TRAINER", status: "ACTIVE" },
      { batchId: batchSvuceEv.id, trainerId: t5.id, role: "LEAD_TRAINER", status: "ACTIVE" },
    ],
  });

  // 8. Students
  const gvpStudents = await Promise.all([
    prisma.student.create({
      data: {
        studentUid: "AP-AU-APVSP001-2026-000001",
        universityId: au.id,
        universityRollNo: "23131A0501",
        fullName: "Sai Kiran Reddy",
        email: "saikiran.23131a0501@gvpce.ac.in",
        phone: "9100112201",
        maskedIdentifier: "XXXX-XXXX-2201",
        gender: "Male",
        institutionId: gvp.id,
        district: "Visakhapatnam",
        branch: "CSE",
        yearOfStudy: 3,
      },
    }),
    prisma.student.create({
      data: {
        studentUid: "AP-AU-APVSP001-2026-000002",
        universityId: au.id,
        universityRollNo: "23131A0502",
        fullName: "Divya Sri Lakshmi",
        email: "divyasri.23131a0502@gvpce.ac.in",
        phone: "9100112202",
        maskedIdentifier: "XXXX-XXXX-2202",
        gender: "Female",
        institutionId: gvp.id,
        district: "Visakhapatnam",
        branch: "CSE",
        yearOfStudy: 3,
      },
    }),
    prisma.student.create({
      data: {
        studentUid: "AP-AU-APVSP001-2026-000003",
        universityId: au.id,
        universityRollNo: "23131A0503",
        fullName: "Harsha Vardhan Naidu",
        email: "harsha.23131a0503@gvpce.ac.in",
        phone: "9100112203",
        maskedIdentifier: "XXXX-XXXX-2203",
        gender: "Male",
        institutionId: gvp.id,
        district: "Visakhapatnam",
        branch: "IT",
        yearOfStudy: 4,
      },
    }),
    prisma.student.create({
      data: {
        studentUid: "AP-AU-APVSP001-2026-000004",
        universityId: au.id,
        universityRollNo: "23131A0504",
        fullName: "Keerthana Devi",
        email: "keerthana.23131a0504@gvpce.ac.in",
        phone: "9100112204",
        maskedIdentifier: "XXXX-XXXX-2204",
        gender: "Female",
        institutionId: gvp.id,
        district: "Visakhapatnam",
        branch: "CSE",
        yearOfStudy: 4,
      },
    }),
    prisma.student.create({
      data: {
        studentUid: "AP-AU-APVSP001-2026-000005",
        universityId: au.id,
        universityRollNo: "23131A0412",
        fullName: "Rohith Sharma P.",
        email: "rohith.23131a0412@gvpce.ac.in",
        phone: "9100112205",
        maskedIdentifier: "XXXX-XXXX-2205",
        gender: "Male",
        institutionId: gvp.id,
        district: "Visakhapatnam",
        branch: "ECE",
        yearOfStudy: 3,
      },
    }),
  ]);

  const vrsecStudents = await Promise.all([
    prisma.student.create({
      data: {
        studentUid: "AP-JNTUK-APNTR002-2026-000006",
        universityId: jntuk.id,
        universityRollNo: "238W1A0401",
        fullName: "Tejaswi Chowdary",
        email: "tejaswi.401@vrsec.ac.in",
        phone: "9200112201",
        maskedIdentifier: "XXXX-XXXX-3201",
        gender: "Female",
        institutionId: vrsec.id,
        district: "NTR (Vijayawada)",
        branch: "ECE",
        yearOfStudy: 3,
      },
    }),
    prisma.student.create({
      data: {
        studentUid: "AP-JNTUK-APNTR002-2026-000007",
        universityId: jntuk.id,
        universityRollNo: "238W1A0402",
        fullName: "Nikhil Sai Prasad",
        email: "nikhil.402@vrsec.ac.in",
        phone: "9200112202",
        maskedIdentifier: "XXXX-XXXX-3202",
        gender: "Male",
        institutionId: vrsec.id,
        district: "NTR (Vijayawada)",
        branch: "ECE",
        yearOfStudy: 3,
      },
    }),
    prisma.student.create({
      data: {
        studentUid: "AP-JNTUK-APNTR002-2026-000008",
        universityId: jntuk.id,
        universityRollNo: "238W1A0515",
        fullName: "Bhavya Sree",
        email: "bhavya.515@vrsec.ac.in",
        phone: "9200112203",
        maskedIdentifier: "XXXX-XXXX-3203",
        gender: "Female",
        institutionId: vrsec.id,
        district: "NTR (Vijayawada)",
        branch: "CSE",
        yearOfStudy: 4,
      },
    }),
    prisma.student.create({
      data: {
        studentUid: "AP-JNTUK-APNTR002-2026-000009",
        universityId: jntuk.id,
        universityRollNo: "238W1A0516",
        fullName: "Pavan Kalyan V.",
        email: "pavan.516@vrsec.ac.in",
        phone: "9200112204",
        maskedIdentifier: "XXXX-XXXX-3204",
        gender: "Male",
        institutionId: vrsec.id,
        district: "NTR (Vijayawada)",
        branch: "CSE",
        yearOfStudy: 4,
      },
    }),
  ]);

  const svuceStudents = await Promise.all([
    prisma.student.create({
      data: {
        studentUid: "AP-SVU-APTPT003-2026-000010",
        universityId: svu.id,
        universityRollNo: "23SV1A0201",
        fullName: "Mahesh Babu G.",
        email: "mahesh.201@svuce.edu.in",
        phone: "9300112201",
        maskedIdentifier: "XXXX-XXXX-4201",
        gender: "Male",
        institutionId: svuce.id,
        district: "Tirupati",
        branch: "EEE",
        yearOfStudy: 4,
      },
    }),
    prisma.student.create({
      data: {
        studentUid: "AP-SVU-APTPT003-2026-000011",
        universityId: svu.id,
        universityRollNo: "23SV1A0202",
        fullName: "Sravani Kumari",
        email: "sravani.202@svuce.edu.in",
        phone: "9300112202",
        maskedIdentifier: "XXXX-XXXX-4202",
        gender: "Female",
        institutionId: svuce.id,
        district: "Tirupati",
        branch: "EEE",
        yearOfStudy: 3,
      },
    }),
  ]);

  // 9. Enrollments
  for (let i = 0; i < gvpStudents.length; i++) {
    await prisma.batchEnrollment.create({
      data: {
        batchId: i < 3 ? batchGvpAi.id : batchGvpFs.id,
        studentId: gvpStudents[i].id,
        progressPercent: 60 + i * 7,
      },
    });
  }
  for (let i = 0; i < vrsecStudents.length; i++) {
    await prisma.batchEnrollment.create({
      data: {
        batchId: i < 2 ? batchVrsecIot.id : batchVrsecDa.id,
        studentId: vrsecStudents[i].id,
        progressPercent: 55 + i * 10,
      },
    });
  }
  for (let i = 0; i < svuceStudents.length; i++) {
    await prisma.batchEnrollment.create({
      data: {
        batchId: batchSvuceEv.id,
        studentId: svuceStudents[i].id,
        progressPercent: 70 + i * 12,
      },
    });
  }

  // 10. Attendance
  const dates = ["2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"];
  for (const date of dates) {
    for (let i = 0; i < 3; i++) {
      await prisma.attendance.create({
        data: {
          batchId: batchGvpAi.id,
          studentId: gvpStudents[i].id,
          date,
          status: i === 2 && date === "2026-11-14" ? "ABSENT" : "PRESENT",
          markedById: gvpAdmin.id,
        },
      });
    }
    for (let i = 0; i < 2; i++) {
      await prisma.attendance.create({
        data: {
          batchId: batchVrsecIot.id,
          studentId: vrsecStudents[i].id,
          date,
          status: i === 1 && date === "2026-11-13" ? "LATE" : "PRESENT",
          markedById: vrsecAdmin.id,
        },
      });
    }
  }

  // 11. System Configs
  await prisma.systemConfig.createMany({
    data: [
      {
        key: "PLATFORM_NAME",
        value: "Andhra Pradesh Skill Development LMS",
        category: "General",
        description: "Official statewide LMS platform title",
        updatedBy: superAdmin.email,
      },
      {
        key: "ACADEMIC_YEAR",
        value: "2026-2027",
        category: "Academic",
        description: "Active statewide skill training academic cycle",
        updatedBy: superAdmin.email,
      },
      {
        key: "MIN_ATTENDANCE_THRESHOLD",
        value: "75",
        category: "Compliance",
        description: "Minimum attendance percentage required for certification",
        updatedBy: superAdmin.email,
      },
      {
        key: "TARGET_INSTITUTIONS_CAPACITY",
        value: "800",
        category: "Infrastructure",
        description: "Statewide target affiliated colleges across Andhra Pradesh",
        updatedBy: superAdmin.email,
      },
      {
        key: "FORCE_TEMP_PASSWORD_RESET",
        value: "true",
        category: "Security",
        description: "Require College Admins to change temporary password on first login",
        updatedBy: superAdmin.email,
      },
      {
        key: "STUDENT_ID_PATTERN",
        value: "AP-{UNIVERSITY_CODE}-{INSTITUTION_CODE}-{YEAR}-{SEQUENCE}",
        category: "Identifiers",
        description: "Configurable rule for immutable LMS Student ID generation",
        updatedBy: superAdmin.email,
      },
      {
        key: "BATCH_ID_PATTERN",
        value: "BAT-{UNIVERSITY_CODE}-{INSTITUTION_CODE}-{YEAR}-{SEQUENCE}",
        category: "Identifiers",
        description: "Configurable rule for Batch ID generation",
        updatedBy: superAdmin.email,
      },
      {
        key: "INSTITUTION_ID_PATTERN",
        value: "AP-{DISTRICT_CODE}-{SEQUENCE}",
        category: "Identifiers",
        description: "Configurable rule for Institution code generation",
        updatedBy: superAdmin.email,
      },
      {
        key: "PASSWORD_MIN_LENGTH",
        value: "8",
        category: "Security",
        description: "Minimum password length with upper, lower, number, and symbol",
        updatedBy: superAdmin.email,
      },
      {
        key: "NOTIFICATION_CHANNELS",
        value: "IN_APP",
        category: "Notifications",
        description: "Active notification delivery channels (IN_APP, EMAIL, SMS, WHATSAPP)",
        updatedBy: superAdmin.email,
      },
      {
        key: "REPORT_DEFAULT_PAGE_SIZE",
        value: "25",
        category: "Reports",
        description: "Default server-side pagination page size for reports and tables",
        updatedBy: superAdmin.email,
      },
    ],
  });

  // 12. Normalized RBAC: Roles, Permissions, RolePermissions, UserRoles
  const roleDefs = [
    {
      key: "SUPER_ADMIN",
      name: "Super Admin",
      description: "Central AP Skill Development authority controlling universities, institutions, admins, courses, trainers, and governance.",
      scope: "STATEWIDE",
      hierarchyLevel: 1,
      isSystem: true,
    },
    {
      key: "STATE_COORDINATOR",
      name: "State Coordinator",
      description: "Monitors statewide training delivery, institutions, batches, and academic compliance.",
      scope: "STATEWIDE",
      hierarchyLevel: 2,
      isSystem: false,
    },
    {
      key: "AUDITOR",
      name: "Auditor",
      description: "Read-only statewide compliance auditor with access to audit logs, attendance, and reports.",
      scope: "STATEWIDE",
      hierarchyLevel: 2,
      isSystem: false,
    },
    {
      key: "REPORTING_OFFICER",
      name: "Reporting Officer",
      description: "Generates and exports statewide and institution-level analytical reports.",
      scope: "STATEWIDE",
      hierarchyLevel: 2,
      isSystem: false,
    },
    {
      key: "DISTRICT_COORDINATOR",
      name: "District Coordinator",
      description: "Oversees affiliated colleges, batches, and attendance within a designated AP district.",
      scope: "DISTRICT",
      hierarchyLevel: 3,
      isSystem: false,
    },
    {
      key: "COLLEGE_ADMIN",
      name: "College Admin",
      description: "Institution-isolated administrator managing students, batches, attendance, and reports for one college.",
      scope: "INSTITUTION",
      hierarchyLevel: 4,
      isSystem: true,
    },
    {
      key: "INSTITUTION_MANAGER",
      name: "Institution Manager",
      description: "Assists College Admin with batch scheduling, student enrollment, and attendance oversight.",
      scope: "INSTITUTION",
      hierarchyLevel: 4,
      isSystem: false,
    },
    {
      key: "TRAINER",
      name: "Trainer",
      description: "Delivers skill training, marks batch attendance, and tracks student training progress.",
      scope: "BATCH",
      hierarchyLevel: 5,
      isSystem: false,
    },
  ];

  const createdRoles: Record<string, { id: string; key: string }> = {};
  for (const r of roleDefs) {
    createdRoles[r.key] = await prisma.role.create({ data: r });
  }

  const permDefs = [
    { key: "dashboard:statewide", module: "Dashboard", label: "View Statewide Dashboard", description: "Access statewide statistics and institution overview" },
    { key: "dashboard:institution", module: "Dashboard", label: "View Institution Dashboard", description: "Access institution-scoped dashboard metrics" },
    { key: "search:global", module: "Search", label: "Global Platform Search", description: "Search across all institutions, students, courses, and trainers" },
    { key: "universities:manage", module: "Universities", label: "Manage Universities", description: "Create, edit, deactivate, and restore universities" },
    { key: "institutions:read", module: "Institutions", label: "View Institutions", description: "View affiliated institutions directory" },
    { key: "institutions:manage", module: "Institutions", label: "Manage Institutions", description: "Create, edit, assign courses, deactivate, and restore institutions" },
    { key: "admins:manage", module: "Administrators", label: "Manage College Admins", description: "Provision College Admins and reset temporary passwords" },
    { key: "courses:read", module: "Courses", label: "View Courses", description: "View course catalog or assigned courses" },
    { key: "courses:manage", module: "Courses", label: "Manage Courses", description: "Create, edit, deactivate, and restore courses" },
    { key: "trainers:read", module: "Trainers", label: "View Trainers", description: "View trainer directory or assigned trainers" },
    { key: "trainers:manage", module: "Trainers", label: "Manage Trainers", description: "Create, edit, deactivate, restore trainers and assign to batches" },
    { key: "batches:read", module: "Batches", label: "View Batches", description: "View training batches and enrollments" },
    { key: "batches:manage", module: "Batches", label: "Manage Batches & Enrollment", description: "Create batches, enroll students, and update progress" },
    { key: "students:read", module: "Students", label: "View & Search Students", description: "View and search student records within permitted scope" },
    { key: "students:manage", module: "Students", label: "Register & Edit Students", description: "Register, edit, deactivate, and restore students" },
    { key: "students:sensitive", module: "Students", label: "View Masked Identifiers", description: "View masked personal identifiers (e.g. XXXX-XXXX-1234)" },
    { key: "attendance:read", module: "Attendance", label: "Monitor Attendance", description: "View batch attendance records" },
    { key: "attendance:mark", module: "Attendance", label: "Mark Attendance", description: "Mark and update daily batch attendance" },
    { key: "reports:read", module: "Reports", label: "View Reports", description: "Preview analytical reports within permitted scope" },
    { key: "reports:export", module: "Reports", label: "Export CSV Reports", description: "Download CSV reports within permitted scope" },
    { key: "governance:manage", module: "Governance", label: "Manage Config, RBAC & Audit", description: "Modify system configs, roles, permissions, and view audit logs" },
    { key: "audit:read", module: "Governance", label: "View Audit Logs", description: "Inspect security and administrative audit logs" },
  ];

  const createdPerms: Record<string, { id: string; key: string }> = {};
  for (const p of permDefs) {
    createdPerms[p.key] = await prisma.permission.create({ data: p });
  }

  const roleMatrix: Record<string, string[]> = {
    SUPER_ADMIN: permDefs.map((p) => p.key),
    STATE_COORDINATOR: [
      "dashboard:statewide", "search:global", "institutions:read", "courses:read",
      "trainers:read", "batches:read", "students:read", "attendance:read", "reports:read", "reports:export",
    ],
    AUDITOR: [
      "dashboard:statewide", "institutions:read", "batches:read", "students:read",
      "attendance:read", "reports:read", "reports:export", "audit:read",
    ],
    REPORTING_OFFICER: [
      "dashboard:statewide", "institutions:read", "batches:read", "students:read",
      "attendance:read", "reports:read", "reports:export",
    ],
    DISTRICT_COORDINATOR: [
      "dashboard:statewide", "institutions:read", "courses:read", "trainers:read",
      "batches:read", "students:read", "attendance:read", "reports:read",
    ],
    COLLEGE_ADMIN: [
      "dashboard:institution", "courses:read", "trainers:read",
      "batches:read", "batches:manage", "students:read", "students:manage",
      "attendance:read", "attendance:mark", "reports:read", "reports:export",
    ],
    INSTITUTION_MANAGER: [
      "dashboard:institution", "courses:read", "trainers:read",
      "batches:read", "batches:manage", "students:read", "attendance:read", "attendance:mark", "reports:read",
    ],
    TRAINER: [
      "dashboard:institution", "courses:read", "batches:read", "students:read", "attendance:read", "attendance:mark",
    ],
  };

  for (const [roleKey, permKeys] of Object.entries(roleMatrix)) {
    const roleId = createdRoles[roleKey].id;
    for (const pKey of permKeys) {
      await prisma.rolePermission.create({
        data: {
          roleId,
          permissionId: createdPerms[pKey].id,
          enabled: true,
        },
      });
    }
  }

  // Assign UserRoles
  await prisma.userRole.createMany({
    data: [
      { userId: superAdmin.id, roleId: createdRoles["SUPER_ADMIN"].id, assignedBy: "SYSTEM" },
      { userId: gvpAdmin.id, roleId: createdRoles["COLLEGE_ADMIN"].id, assignedBy: superAdmin.email },
      { userId: vrsecAdmin.id, roleId: createdRoles["COLLEGE_ADMIN"].id, assignedBy: superAdmin.email },
      { userId: svuceAdmin.id, roleId: createdRoles["COLLEGE_ADMIN"].id, assignedBy: superAdmin.email },
    ],
  });

  // 13. Initial Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: superAdmin.id,
        actorRole: "SUPER_ADMIN",
        actorEmail: superAdmin.email,
        action: "SYSTEM_INITIALIZED",
        entityType: "Platform",
        detailsJson: JSON.stringify({ institutionsSeeded: institutions.length, universitiesSeeded: universities.length }),
      },
      {
        actorId: superAdmin.id,
        actorRole: "SUPER_ADMIN",
        actorEmail: superAdmin.email,
        institutionId: gvp.id,
        action: "ASSIGN_TRAINER_TO_BATCH",
        entityType: "Batch",
        entityId: batchGvpAi.id,
        detailsJson: JSON.stringify({ batchCode: batchGvpAi.batchCode, trainer: t1.fullName }),
      },
      {
        actorId: gvpAdmin.id,
        actorRole: "COLLEGE_ADMIN",
        actorEmail: gvpAdmin.email,
        institutionId: gvp.id,
        action: "MARK_BATCH_ATTENDANCE",
        entityType: "Attendance",
        entityId: batchGvpAi.id,
        detailsJson: JSON.stringify({ date: "2026-11-15", count: 3 }),
      },
    ],
  });

  // 14. Certificates & Notifications
  await prisma.certificate.createMany({
    data: [
      {
        certificateNumber: "CERT-AP-2026-00001",
        studentId: gvpStudents[0].id,
        batchId: batchGvpAi.id,
        courseId: cAI.id,
        institutionId: gvp.id,
        issuedDate: new Date("2026-11-10"),
        status: "ISSUED",
      },
      {
        certificateNumber: "CERT-AP-2026-00002",
        studentId: vrsecStudents[0].id,
        batchId: batchVrsecIot.id,
        courseId: cIOT.id,
        institutionId: vrsec.id,
        status: "PENDING",
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        institutionId: gvp.id,
        title: "Attendance Compliance Reminder",
        message: "Maintain >=75% attendance for all active AI & Cloud cohorts.",
      },
      {
        institutionId: vrsec.id,
        title: "Trainer Assignment Confirmed",
        message: "Praveen Kumar Goud assigned to VRSEC Industrial IoT Batch 1.",
      },
    ],
  });

  console.log("Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
