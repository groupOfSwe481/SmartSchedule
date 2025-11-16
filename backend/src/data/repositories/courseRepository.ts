import { ObjectId } from 'mongodb';
import { getDB } from '../../db/connection.js';
import { Course } from '../../types/index.js';

class CourseRepository {
  async findAll(): Promise<Course[]> {
    const db = getDB();
    return await db.collection<Course>('Course').find({}).sort({ code: 1 }).toArray();
  }

  async findByCode(courseCode: string): Promise<Course | null> {
    const db = getDB();
    return await db.collection<Course>('Course').findOne({ 
      code: courseCode.toUpperCase().trim() 
    });
  }

  async findByName(courseName: string): Promise<Course | null> {
    const db = getDB();
    return await db.collection<Course>('Course').findOne({ 
      name: { $regex: new RegExp(`^${courseName.trim()}$`, 'i') }
    });
  }

  async findByDepartment(department: string): Promise<Course[]> {
    const db = getDB();
    const query = department && department !== 'all' 
      ? { department } 
      : {};
    return await db.collection<Course>('Course').find(query).toArray();
  }

  async findCoursesByIds(courseIds: ObjectId[]): Promise<Course[]> {
    const db = getDB();
    return await db.collection<Course>('Course')
      .find({ _id: { $in: courseIds } })
      .toArray();
  }

  async validatePrerequisites(prerequisites: string[]): Promise<Course[]> {
    const db = getDB();
    return await db.collection<Course>('Course')
      .find({ code: { $in: prerequisites } })
      .toArray();
  }

  async create(courseData: Course): Promise<Course> {
    const db = getDB();
    const result = await db.collection<Course>('Course').insertOne(courseData);
    return { ...courseData, _id: result.insertedId };
  }

  async update(courseCode: string, updateData: Partial<Course>): Promise<boolean> {
    const db = getDB();
    const result = await db.collection<Course>('Course').updateOne(
      { code: courseCode.toUpperCase() },
      { $set: { ...updateData, updated_at: new Date() } }
    );
    return result.modifiedCount > 0;
  }

  async delete(courseCode: string): Promise<boolean> {
    const db = getDB();
    const result = await db.collection<Course>('Course').deleteOne({
      code: courseCode.toUpperCase()
    });
    return result.deletedCount > 0;
  }
}

export default new CourseRepository();
