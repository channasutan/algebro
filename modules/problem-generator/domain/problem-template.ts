export type ParameterDefinition = {
  type: "int";
  min: number;
  max: number;
};
export type ParameterSchema = Record<string, ParameterDefinition>;
export type ProblemTemplate = {
  id: string;
  name: string;
  templateLatex: string;
  parameterSchema: ParameterSchema | null;
  baseDifficulty: number;
  createdAt: string;
};
