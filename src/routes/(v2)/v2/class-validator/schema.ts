import { IsEmail, IsString, MinLength } from 'class-validator';

class ClassValidatorSchema {
	@IsString()
	@MinLength(2)
	name: string = '';

	@IsString()
	@IsEmail()
	email: string = '';
}

export const schema = ClassValidatorSchema;
