import { fullName, initialsOf, avatarColor } from "../utils/person";

export default function Avatar({ person, size = "w-8 h-8", textSize = "text-xs" }) {
  const name = fullName(person);
  const deceased = !!person.deceased;
  const dim = deceased ? "opacity-50 saturate-50" : "";
  if (person?.photoUrl) {
    return <img src={person.photoUrl} alt={name} className={`${size} rounded-full object-cover shrink-0 ${dim}`} />;
  }
  return (
    <div
      className={`${size} rounded-full ${avatarColor(name)} flex items-center justify-center ${textSize} font-semibold text-white shrink-0 ${dim}`}
    >
      {initialsOf(person.firstName, person.lastName)}
    </div>
  );
}
