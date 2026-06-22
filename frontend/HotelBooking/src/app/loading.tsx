import { SkeletonCard } from "@/components/ui/Skeleton";
import styles from "@/styles/Loading.module.css";

export default function Loading() {
    return (
        <div className={styles.wrapper}>
            <SkeletonCard rows={3} />
            <SkeletonCard rows={5} />
            <SkeletonCard rows={4} />
        </div>
    );
}
