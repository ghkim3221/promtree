import produce from "immer";

import type Meter from "../types/Meter";
import MetricType from "../types/MetricType";

export default function parsePrometheus(content: string): {
  [name: string]: Meter;
} {
  let meters: { [name: string]: Meter } = {};
  // TODO(ghkim3221): Refactoring
  content
    .split("\n")
    .filter((line) => line)
    .forEach((line) => {
      if (line.startsWith("# HELP")) {
        const { name, description } = parseHelpText(line);
        if (name in meters) {
          meters[name] = produce(meters[name], (draft) => {
            draft.description = description;
          });
        } else {
          meters[name] = {
            name: name,
            description: description,
            type: MetricType.Unknown,
            count: 0,
          };
        }
      } else if (line.startsWith("# TYPE")) {
        const { name, type } = parseTypeInformation(line);
        if (name in meters) {
          meters[name] = produce(meters[name], (draft) => {
            draft.type = type;
          });
        } else {
          meters[name] = {
            name: name,
            description: "",
            type: type,
            count: 0,
          };
        }
      } else {
        const nameIndex = parseNameIndex(line);
        const name = line.substring(0, nameIndex);
        if (name in meters) {
          meters[name] = produce(meters[name], (draft) => {
            draft.count += 1;
          });
        } else {
          meters[name] = {
            name: name,
            description: "",
            type: MetricType.Unknown,
            count: 1,
          };
        }
      }
    });
  return meters;
}

function parseHelpText(line: string): { name: string; description: string } {
  const remaining = line.substring(7); // `# HELP` + trailing whitespace.

  const name = remaining.substring(0, remaining.indexOf(" "));
  const description = remaining.substring(name.length + 1);
  return { name, description };
}

function parseTypeInformation(line: string): {
  name: string;
  type: MetricType;
} {
  const remaining = line.substring(7); // `# TYPE` + trailing whiespace.

  const name = remaining.substring(0, remaining.indexOf(" "));
  const typeString = remaining.substring(name.length + 1).toLowerCase();
  const type = typeString as MetricType;
  return { name, type };
}

function parseNameIndex(line: string): number {
  const bracket = line.indexOf("{");
  if (bracket > 0) {
    return bracket;
  }

  const whitespace = line.indexOf(" ");
  if (whitespace > 0) {
    return whitespace;
  }

  return -1;
}
