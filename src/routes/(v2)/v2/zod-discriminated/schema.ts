import { z } from 'zod';

export const schema = z.object({
	name: z.string().min(1),
	email: z.string().email()
});

export enum ProfileType {
	STUDENT = 'STUDENT',
	FACULTY = 'FACULTY',
	STAFF = 'STAFF'
}

const studentZSchema = z.object({
	yearOfStudy: z.number().min(1),
	branch: z.string().min(2),
	department: z.string().min(2),
	studentId: z.string().min(2),
	clubs: z.array(z.string()).optional()
});

const facultyZSchema = z.object({
	department: z.string().min(2),
	branch: z.string().min(2),
	designation: z.string().min(2),
	facultyId: z.string().min(2)
});

const staffZSchema = z.object({
	department: z.string().min(2),
	branch: z.string().min(2),
	designation: z.string().min(2),
	staffId: z.string().min(2)
});

const profileSchema = z
	.discriminatedUnion('type', [
		z.object({
			type: z.literal(ProfileType.STUDENT),
			typeData: studentZSchema
		}),
		z.object({
			type: z.literal(ProfileType.FACULTY),
			typeData: facultyZSchema
		}),
		z.object({
			type: z.literal(ProfileType.STAFF),
			typeData: staffZSchema
		})
	])
	.default({
		type: ProfileType.STUDENT,
		typeData: { yearOfStudy: 1, branch: '', department: '', studentId: '' }
	});

export const UserProfileZodSchema = z
	.object({
		name: z.string().min(2),
		email: z.string().email(),
		type: z.nativeEnum(ProfileType)
	})
	.and(profileSchema);
