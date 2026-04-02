import { supabase, supabaseKey, supabaseUrl } from "../../lib/supabase";
import {
  detectStudentDiscountOpportunities,
  type StudentDiscountDetectorInput,
  type StudentDiscountOpportunity,
} from "../../shared/studentDiscountDetector";

const STUDENT_DISCOUNT_ENDPOINT =
  `${supabaseUrl}/functions/v1/server/make-server-b711015c/student-discounts/detect`;

export async function detectStudentDiscounts(
  input: StudentDiscountDetectorInput,
): Promise<StudentDiscountOpportunity[]> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch(STUDENT_DISCOUNT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`Detector request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as {
      opportunities?: StudentDiscountOpportunity[];
    };

    return payload.opportunities ?? [];
  } catch {
    return detectStudentDiscountOpportunities(input);
  }
}
