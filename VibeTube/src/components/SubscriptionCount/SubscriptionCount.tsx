import { pluralize } from "../../shared/lib/pluralize";

interface Props {
  count: number;
}

export const SubscribersCount = ({ count }: Props) => {
  const word = pluralize(count, ["подписчик", "подписчика", "подписчиков"]);
  
  return (
    <>
      {count} {word}
    </>
  );
};