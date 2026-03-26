export class RecordId {
	public readonly id: number;
	public readonly tb: string;

	constructor(id: number, tb: string) {
		if (!id) throw new Error('id is required');
		if (!tb) throw new Error('tb is required');
		this.id = id;
		this.tb = tb;
	}

	public toString() {
		return `${this.id} for table ${this.tb}`;
	}
}
