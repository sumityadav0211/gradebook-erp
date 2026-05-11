
export interface Exam {
  id: string;
  exam_name: string;
  out_of_marks: number;
}

export interface Subject {
  id: string;
  subject_name: string;
  is_graded?: boolean;
}

export interface MarksData {
  [subject_id: string]: {
    [exam_id: string]: {
      gained_marks: number;
      out_of_marks: number;
      grade?: string;
    };
  };
}

export const mapToSubjectRows = (subjects: Subject[], exams: Exam[], marksData: MarksData) => {
  return subjects.map((subject) => {
    const marks: { [key: string]: { gained: number; outOf: number; grade?: string } } = {};
    let totalGained = 0;
    let totalOutOf = 0;
    let lastGrade = '';

    const isActuallyGraded = subject.is_graded || subject.subject_name.toLowerCase().includes('sport');
    
    exams.forEach((exam) => {
      const mark = marksData[subject.id]?.[exam.id];
      if (mark) {
        marks[exam.id] = { 
          gained: mark.gained_marks, 
          outOf: mark.out_of_marks,
          grade: mark.grade 
        };
        if (!isActuallyGraded) {
          totalGained += mark.gained_marks;
          totalOutOf += mark.out_of_marks;
        } else {
          lastGrade = mark.grade || lastGrade;
        }
      } else {
        marks[exam.id] = { gained: 0, outOf: exam.out_of_marks };
        if (!isActuallyGraded) {
          totalOutOf += exam.out_of_marks;
        }
      }
    });

    const percentage = totalOutOf > 0 ? (totalGained / totalOutOf) * 100 : 0;
    const getGrade = (pct: number) => {
      if (isActuallyGraded) return lastGrade || '-';
      if (pct >= 90) return 'A+';
      if (pct >= 75) return 'A';
      if (pct >= 60) return 'B';
      if (pct >= 45) return 'C';
      if (pct >= 35) return 'D';
      return 'F';
    };

    return {
      subject_name: subject.subject_name.replace(/\(ALT\)/gi, '').replace(/ALT/gi, '').trim().toUpperCase(),
      marks,
      totalGained,
      totalOutOf,
      percentage,
      grade: getGrade(percentage),
      is_graded: isActuallyGraded
    };
  });
};
