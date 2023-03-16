import { z } from 'zod';

export const schema = z.object({
  ids: z.object({
    id: z.number().int().min(3).array()
  })
});

/*
const data = {
  ids: {
    id: [1,2,3]
  }
}

const data2 = {
  ids: {
    id: [3,4,5]
  }
}
*/
