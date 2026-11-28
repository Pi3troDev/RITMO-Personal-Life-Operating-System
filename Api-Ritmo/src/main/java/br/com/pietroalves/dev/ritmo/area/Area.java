package br.com.pietroalves.dev.ritmo.area;

import br.com.pietroalves.dev.ritmo.user.User;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/** Área da vida (Trabalho, Estudos, Saúde…). Cada usuário tem várias. */
@Entity
@Table(name = "areas")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Area {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Muitas áreas pertencem a um usuário. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Setter
    private String name;

    @Setter
    private String color;

    @Setter
    private String icon;

    @Setter
    private int position;

    @Setter
    private Instant archivedAt;

    @CreationTimestamp
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    public Area(User user, String name, String color, String icon, int position) {
        this.user = user;
        this.name = name;
        this.color = color;
        this.icon = icon;
        this.position = position;
    }
}
